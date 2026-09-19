import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useIsWide } from '../../../src/lib/useIsWide'

// jsdom has no matchMedia. Stubbed here as the browser boundary it is, with a
// handle to fire the change the real one would.
function stubMedia(startsWide) {
  const listeners = new Set()
  window.matchMedia = vi.fn(query => ({
    matches: startsWide,
    media: query,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  }))
  return {
    resizeTo: matches => act(() => { listeners.forEach(fn => fn({ matches })) }),
    listenerCount: () => listeners.size,
  }
}

const setWidth = px => { window.innerWidth = px }

afterEach(() => { delete window.matchMedia })

describe('useIsWide', () => {
  describe('on first render', () => {
    it('is wide when there is room for the panel beside the picture', () => {
      setWidth(1200)
      stubMedia(true)
      expect(renderHook(() => useIsWide()).result.current).toBe(true)
    })

    it('is not wide below 900px', () => {
      setWidth(880)
      stubMedia(false)
      expect(renderHook(() => useIsWide()).result.current).toBe(false)
    })

    it('treats exactly 900px as wide enough', () => {
      setWidth(900)
      stubMedia(true)
      expect(renderHook(() => useIsWide()).result.current).toBe(true)
    })
  })

  describe('when the window changes', () => {
    it('follows the answer, not every pixel of the drag', () => {
      setWidth(1200)
      const media = stubMedia(true)
      const { result } = renderHook(() => useIsWide())

      media.resizeTo(false)
      expect(result.current).toBe(false)

      media.resizeTo(true)
      expect(result.current).toBe(true)
    })

    it('asks about 900px', () => {
      setWidth(1200)
      stubMedia(true)
      renderHook(() => useIsWide())
      expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 900px)')
    })
  })

  describe('once the component goes', () => {
    it('stops listening', () => {
      setWidth(1200)
      const media = stubMedia(true)
      const { unmount } = renderHook(() => useIsWide())
      unmount()
      expect(media.listenerCount()).toBe(0)
    })
  })
})
