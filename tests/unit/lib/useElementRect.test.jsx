import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useElementRect } from '../../../src/lib/useElementRect'

// jsdom lays nothing out, so every element measures zero. The sizes come from
// here instead — which is also how the "not yet decoded" case is reproduced.
let observers
let realResizeObserver

function elementOf(rect) {
  return { getBoundingClientRect: () => rect }
}

const A_RECT = { left: 10, top: 20, width: 800, height: 600 }

beforeEach(() => {
  observers = []
  realResizeObserver = global.ResizeObserver
  global.ResizeObserver = class {
    constructor(cb) { this.cb = cb; observers.push(this) }
    observe() {}
    disconnect() { this.disconnected = true }
  }
})

afterEach(() => { global.ResizeObserver = realResizeObserver })

const flush = async () => { await act(async () => { await Promise.resolve() }) }

describe('useElementRect', () => {
  describe('when nothing wants a measurement', () => {
    it('reports none', async () => {
      const ref = { current: elementOf(A_RECT) }
      const { result } = renderHook(() => useElementRect(ref, false))
      await flush()
      expect(result.current).toBeNull()
    })
  })

  describe('when something does', () => {
    it('gives the box in window coordinates', async () => {
      const ref = { current: elementOf(A_RECT) }
      const { result } = renderHook(() => useElementRect(ref, true))
      await flush()
      expect(result.current).toEqual(A_RECT)
    })

    it('measures nothing when the ref is empty', async () => {
      const { result } = renderHook(() => useElementRect({ current: null }, true))
      await flush()
      expect(result.current).toBeNull()
    })
  })

  describe('when the photograph has not decoded yet', () => {
    // It measures zero, everything drawn on it then divides by zero, and a
    // perfectly real drag collapses to a point the server refuses.
    it('refuses to call a zero-size box a measurement', async () => {
      const ref = { current: elementOf({ left: 0, top: 0, width: 0, height: 0 }) }
      const { result } = renderHook(() => useElementRect(ref, true))
      await flush()
      expect(result.current).toBeNull()
    })

    it('measures again once it has laid out', async () => {
      let rect = { left: 0, top: 0, width: 0, height: 0 }
      const ref = { current: { getBoundingClientRect: () => rect } }
      const { result } = renderHook(() => useElementRect(ref, true))
      await flush()
      expect(result.current).toBeNull()

      rect = A_RECT
      await act(async () => { observers.at(-1).cb() })
      expect(result.current).toEqual(A_RECT)
    })
  })

  describe('when the window changes', () => {
    // The photograph is laid out with object-fit, so its box changes with the
    // window even though the element has not moved in the document.
    it('measures again', async () => {
      let rect = A_RECT
      const ref = { current: { getBoundingClientRect: () => rect } }
      const { result } = renderHook(() => useElementRect(ref, true))
      await flush()

      rect = { left: 0, top: 0, width: 400, height: 300 }
      await act(async () => { window.dispatchEvent(new Event('resize')) })
      expect(result.current).toEqual(rect)
    })
  })

  describe('when it is no longer wanted', () => {
    it('forgets the measurement', async () => {
      const ref = { current: elementOf(A_RECT) }
      const { result, rerender } = renderHook(
        ({ active }) => useElementRect(ref, active),
        { initialProps: { active: true } },
      )
      await flush()
      expect(result.current).toEqual(A_RECT)

      rerender({ active: false })
      await flush()
      expect(result.current).toBeNull()
    })

    it('stops watching the element', async () => {
      const ref = { current: elementOf(A_RECT) }
      const { unmount } = renderHook(() => useElementRect(ref, true))
      await flush()
      unmount()
      expect(observers.at(-1).disconnected).toBe(true)
    })
  })
})
