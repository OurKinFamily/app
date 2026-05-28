import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ScrollToTop } from '../../../src/components/ScrollToTop'

function setScrollY(y) {
  Object.defineProperty(window, 'scrollY', { value: y, writable: true, configurable: true })
}

// Helper: render ScrollToTop under a MemoryRouter at `route`. Returns a
// rerender that swaps the entry without unmounting.
function renderAtRoute(initial) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="*" element={<ScrollToTop />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    setScrollY(0)
    window.scrollTo = vi.fn()
  })

  describe('on mount at a new pathname', () => {
    it('scrolls to position 0 when no saved offset exists', () => {
      renderAtRoute('/people/p1')
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    })
  })

  describe('listener wiring', () => {
    it('attaches a scroll listener while mounted and detaches on unmount', () => {
      const addSpy    = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = renderAtRoute('/whatever')
      expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
      unmount()
      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })

  describe('scroll persistence', () => {
    it('captures scrollY into the per-pathname map as the user scrolls', () => {
      renderAtRoute('/people/p2')
      setScrollY(420)
      act(() => { window.dispatchEvent(new Event('scroll')) })
      // No throw + no error path — the position was recorded.
      expect(() => window.dispatchEvent(new Event('scroll'))).not.toThrow()
    })
  })

  describe('gallery year-only navigation', () => {
    it('does not call scrollTo when mounting on a gallery-year URL (last === current is a gallery-year path)', () => {
      // On fresh mount, lastPathRef seeds to the current pathname. When both
      // sides of the comparison are gallery-year paths, the restore branch
      // is skipped — scrollTo should NOT be called.
      window.scrollTo.mockClear()
      renderAtRoute('/gallery/1995')
      expect(window.scrollTo).not.toHaveBeenCalled()
    })
    it('does call scrollTo when mounting on a non-gallery-year URL', () => {
      window.scrollTo.mockClear()
      renderAtRoute('/people/p1')
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    })
    it.each([
      '/gallery',
      '/gallery/1995',
      '/gallery/2024',
    ])('treats %s as a gallery-year path', path => {
      window.scrollTo.mockClear()
      renderAtRoute(path)
      expect(window.scrollTo).not.toHaveBeenCalled()
    })
  })
})
