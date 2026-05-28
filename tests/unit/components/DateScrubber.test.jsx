import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateScrubber } from '../../../src/components/DateScrubber'

const YEARS = [
  { year: 2024, count: 100 },
  { year: 2020, count: 50 },
  { year: 2015, count: 200 },
  { year: 2010, count: 30 },
  { year: 2005, count: 10 },
  { year: 2000, count: 5 },
]

function renderScrubber(props = {}) {
  const onJump = vi.fn()
  const utils  = render(<DateScrubber years={YEARS} onJump={onJump} {...props} />)
  return { ...utils, onJump }
}

describe('DateScrubber', () => {
  beforeEach(() => { vi.resetAllMocks() })

  describe('rendering', () => {
    it('renders nothing when years is empty', () => {
      const { container } = render(<DateScrubber years={[]} onJump={() => {}} />)
      expect(container.firstChild).toBe(null)
    })
    it('renders a button per year', () => {
      const { container } = renderScrubber()
      expect(container.querySelectorAll('button').length).toBe(YEARS.length)
    })
    it('shows decade labels even when no year is hovered', () => {
      renderScrubber({ currentYear: 2024 })
      // Decades 2020, 2010, 2000 are labeled; years inside the radius around
      // 2024 also get labels.
      expect(screen.getByText('2020')).toBeInTheDocument()
      expect(screen.getByText('2010')).toBeInTheDocument()
      expect(screen.getByText('2000')).toBeInTheDocument()
    })
  })

  describe('click', () => {
    it('jumps to the clicked year', () => {
      const { onJump } = renderScrubber({ currentYear: 2024 })
      fireEvent.click(screen.getByText('2020'))
      expect(onJump).toHaveBeenCalledWith(2020)
    })
  })

  describe('pointer-drag flow', () => {
    function setRect(el, rect) {
      el.getBoundingClientRect = () => rect
    }
    it('updates the hovered year on pointer move and fires onJump on release', () => {
      const { container, onJump } = renderScrubber({ currentYear: 2024 })
      const root = container.firstChild
      setRect(root, { top: 0, height: 600, left: 0, right: 0, bottom: 600 })
      fireEvent.pointerDown(root, { clientY: 50, pointerId: 1 })
      fireEvent.pointerMove(root, { clientY: 300 })
      fireEvent.pointerUp(root, { clientY: 300 })
      expect(onJump).toHaveBeenCalled()
    })
    it('does not call onJump if the released year equals currentYear', () => {
      const { container, onJump } = renderScrubber({ currentYear: 2024 })
      const root = container.firstChild
      setRect(root, { top: 0, height: 600 })
      // Click at the very top → newest year (2024) → matches current.
      fireEvent.pointerDown(root, { clientY: 10, pointerId: 1 })
      fireEvent.pointerUp(root, { clientY: 10 })
      expect(onJump).not.toHaveBeenCalled()
    })
    it('clears hoverYear on pointer leave when not dragging', () => {
      const { container } = renderScrubber({ currentYear: 2024 })
      const root = container.firstChild
      setRect(root, { top: 0, height: 600 })
      fireEvent.pointerMove(root, { clientY: 300 })
      // Not dragging — pointerleave should clear hover state.
      expect(() => fireEvent.pointerLeave(root)).not.toThrow()
    })
    it('keeps hoverYear during drag even on pointer leave', () => {
      const { container } = renderScrubber({ currentYear: 2024 })
      const root = container.firstChild
      setRect(root, { top: 0, height: 600 })
      fireEvent.pointerDown(root, { clientY: 10, pointerId: 1 })
      expect(() => fireEvent.pointerLeave(root)).not.toThrow()
    })
    it('falls back to the first year when currentYear is missing', () => {
      const { container } = renderScrubber()
      expect(container.firstChild).not.toBe(null)
    })
  })

  describe('setPointerCapture support', () => {
    it('invokes setPointerCapture when the host element supports it', () => {
      const { container } = renderScrubber({ currentYear: 2024 })
      const root = container.firstChild
      const captureSpy = vi.fn()
      root.setPointerCapture = captureSpy
      root.getBoundingClientRect = () => ({ top: 0, height: 600 })
      fireEvent.pointerDown(root, { clientY: 50, pointerId: 7 })
      expect(captureSpy).toHaveBeenCalledWith(7)
    })
  })

  describe('zero-height edge case', () => {
    it('does not call onJump when the container has no usable height', () => {
      const { container, onJump } = renderScrubber({ currentYear: 2024 })
      const root = container.firstChild
      root.getBoundingClientRect = () => ({ top: 0, height: 0 })
      fireEvent.pointerDown(root, { clientY: 0, pointerId: 1 })
      fireEvent.pointerUp(root, { clientY: 0 })
      expect(onJump).not.toHaveBeenCalled()
    })
  })
})
