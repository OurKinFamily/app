import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Thumb } from '../../../src/components/Thumb'

describe('Thumb', () => {
  describe('image rendering', () => {
    it('renders an <img> when src is provided', () => {
      render(<Thumb src="/x.jpg" alt="x-photo" />)
      const img = screen.getByAltText('x-photo')
      expect(img).toHaveAttribute('src', '/x.jpg')
      expect(img).toHaveAttribute('loading', 'lazy')
    })
    it('renders no <img> when src is missing', () => {
      const { container } = render(<Thumb />)
      expect(container.querySelector('img')).toBe(null)
    })
  })

  describe('interactive element choice', () => {
    it('renders a <button> when onClick is provided', () => {
      const onClick = vi.fn()
      const { container } = render(<Thumb onClick={onClick} />)
      expect(container.querySelector('button')).not.toBe(null)
    })
    it('renders a <div> when no onClick is provided', () => {
      const { container } = render(<Thumb />)
      expect(container.querySelector('div')).not.toBe(null)
      expect(container.querySelector('button')).toBe(null)
    })
    it('invokes onClick when the button is clicked', () => {
      const onClick = vi.fn()
      const { container } = render(<Thumb onClick={onClick} src="/x.jpg" alt="x" />)
      container.querySelector('button').click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('selected state (branch coverage)', () => {
    it('renders without throwing when selected', () => {
      expect(() => render(<Thumb selected />)).not.toThrow()
    })
    it('renders without throwing when interactive but unselected', () => {
      expect(() => render(<Thumb onClick={() => {}} selected={false} />)).not.toThrow()
    })
  })
})
