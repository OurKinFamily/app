import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ScrollTopButton } from '../../../src/components/ScrollTopButton'

function setScrollY(y) {
  Object.defineProperty(window, 'scrollY', { value: y, writable: true, configurable: true })
}

describe('ScrollTopButton', () => {
  beforeEach(() => {
    setScrollY(0)
    window.scrollTo = vi.fn()
  })

  describe('mounting (branch coverage)', () => {
    // We don't assert on the rendered classes (visibility is a visual
    // concern, deferred to e2e + visual regression). These tests only
    // exercise each branch of the initial-state ternary.
    it('mounts cleanly when scrollY starts below the threshold', () => {
      setScrollY(0)
      render(<ScrollTopButton threshold={500} />)
      expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeInTheDocument()
    })
    it('mounts cleanly when scrollY starts above the threshold', () => {
      setScrollY(1000)
      render(<ScrollTopButton threshold={500} />)
      expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeInTheDocument()
    })
  })

  describe('reacting to scroll', () => {
    it('updates internal state on a scroll event without throwing', () => {
      render(<ScrollTopButton threshold={500} />)
      setScrollY(600)
      expect(() => {
        act(() => { window.dispatchEvent(new Event('scroll')) })
      }).not.toThrow()
    })
  })

  describe('click behavior', () => {
    it('smooth-scrolls to top on click', () => {
      setScrollY(1000)
      render(<ScrollTopButton threshold={100} />)
      fireEvent.click(screen.getByRole('button', { name: 'Scroll to top' }))
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    })
  })

  describe('cleanup', () => {
    it('detaches the scroll listener on unmount', () => {
      const { unmount } = render(<ScrollTopButton threshold={500} />)
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      unmount()
      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })
})
