import { describe, it, expect, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScrollLock } from '../../../src/lib/useScrollLock'

afterEach(() => { document.body.style.overflow = '' })

describe('useScrollLock', () => {
  describe('while an overlay is open', () => {
    // Otherwise a stray wheel event scrolls eight million pixels of timeline
    // out from under the reader, and closing the photograph drops them
    // somewhere they have never been.
    it('holds the page still', () => {
      renderHook(() => useScrollLock())
      expect(document.body.style.overflow).toBe('hidden')
    })
  })

  describe('once it closes', () => {
    it('lets the page scroll again', () => {
      const { unmount } = renderHook(() => useScrollLock())
      unmount()
      expect(document.body.style.overflow).toBe('')
    })

    it('puts back whatever was there before, rather than clearing it', () => {
      document.body.style.overflow = 'scroll'
      const { unmount } = renderHook(() => useScrollLock())
      unmount()
      expect(document.body.style.overflow).toBe('scroll')
    })
  })

  describe('with two overlays open at once', () => {
    // The inner one closing must not unlock the page behind the outer one.
    it('stays locked until the last one closes', () => {
      const outer = renderHook(() => useScrollLock())
      const inner = renderHook(() => useScrollLock())
      inner.unmount()
      expect(document.body.style.overflow).toBe('hidden')
      outer.unmount()
      expect(document.body.style.overflow).toBe('')
    })
  })
})
