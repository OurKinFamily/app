import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Media } from '../../../src/components/Media'

function renderMedia(props = {}) {
  return render(<Media {...props} />)
}

describe('Media', () => {
  describe('thumb', () => {
    it('renders an <img> when thumb is provided', () => {
      renderMedia({ thumb: '/t.jpg', alt: 'photo' })
      const img = screen.getByAltText('photo')
      expect(img).toHaveAttribute('src', '/t.jpg')
    })
    it('omits the <img> when no thumb', () => {
      const { container } = renderMedia()
      expect(container.querySelector('img')).toBe(null)
    })
  })

  describe('dominant color background', () => {
    it('applies the color as backgroundColor when provided', () => {
      const { container } = renderMedia({ color: '#abcdef' })
      expect(container.firstChild).toHaveStyle({ backgroundColor: '#abcdef' })
    })
  })

  describe('video indicator', () => {
    it('renders the play overlay when isVideo is true', () => {
      const { container } = renderMedia({ isVideo: true, thumb: '/v.jpg' })
      // Lucide Play renders an <svg>; assert there's at least one in the
      // tree (in addition to the <img> there's no other svg here).
      expect(container.querySelector('svg')).not.toBe(null)
    })
    it('omits the play overlay when isVideo is false', () => {
      const { container } = renderMedia({ thumb: '/p.jpg' })
      expect(container.querySelector('svg')).toBe(null)
    })
  })

  describe('clickability', () => {
    it('renders as a <button> when onClick is given and fires the handler', () => {
      const onClick = vi.fn()
      renderMedia({ onClick, thumb: '/t.jpg', alt: 'p' })
      const btn = screen.getByRole('button')
      btn.click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
    it('renders as a non-button element when no onClick is given', () => {
      const { container } = renderMedia()
      expect(container.querySelector('button')).toBe(null)
    })
  })

  describe('favorite control', () => {
    it('renders a favorite control when onFavorite is given', () => {
      renderMedia({ onFavorite: vi.fn() })
      expect(screen.getByRole('button', { name: 'Favorite' })).toBeInTheDocument()
    })
    it('reflects favorited state in the aria-label', () => {
      renderMedia({ onFavorite: vi.fn(), favorited: true })
      expect(screen.getByRole('button', { name: 'Unfavorite' })).toBeInTheDocument()
    })
    it('omits the favorite control when onFavorite is not provided', () => {
      renderMedia({ thumb: '/x.jpg' })
      expect(screen.queryByRole('button', { name: /favorite/i })).not.toBeInTheDocument()
    })
    it('invokes onFavorite on click and stops propagation', () => {
      const onFavorite = vi.fn()
      const onClick    = vi.fn()
      renderMedia({ onClick, onFavorite })
      fireEvent.click(screen.getByRole('button', { name: 'Favorite' }))
      expect(onFavorite).toHaveBeenCalledTimes(1)
      // Click on the favorite control must not trigger the outer card click.
      expect(onClick).not.toHaveBeenCalled()
    })
    it('invokes onFavorite on Enter or Space and stops propagation', () => {
      const onFavorite = vi.fn()
      const onClick    = vi.fn()
      renderMedia({ onClick, onFavorite })
      const heart = screen.getByRole('button', { name: 'Favorite' })
      fireEvent.keyDown(heart, { key: 'Enter' })
      fireEvent.keyDown(heart, { key: ' ' })
      expect(onFavorite).toHaveBeenCalledTimes(2)
      expect(onClick).not.toHaveBeenCalled()
    })
    it('ignores other keys', () => {
      const onFavorite = vi.fn()
      renderMedia({ onFavorite })
      fireEvent.keyDown(screen.getByRole('button', { name: 'Favorite' }), { key: 'a' })
      expect(onFavorite).not.toHaveBeenCalled()
    })
  })

  describe('selection checkbox', () => {
    it('renders no checkbox without onToggleSelect', () => {
      renderMedia({ onClick: vi.fn() })
      expect(screen.queryByRole('checkbox')).toBe(null)
    })
    it('renders an unchecked checkbox when selectable', () => {
      renderMedia({ onToggleSelect: vi.fn() })
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false')
    })
    it('reflects the selected state via aria-checked', () => {
      renderMedia({ onToggleSelect: vi.fn(), selected: true })
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
    })
    it('calls onToggleSelect (with the event) on click and stops propagation', () => {
      const onToggleSelect = vi.fn()
      const onClick = vi.fn()
      renderMedia({ onClick, onToggleSelect })
      fireEvent.click(screen.getByRole('checkbox'))
      expect(onToggleSelect).toHaveBeenCalledTimes(1)
      expect(onToggleSelect.mock.calls[0][0]).toBeTruthy()  // the event
      expect(onClick).not.toHaveBeenCalled()
    })
    it('toggles on Enter / Space and ignores other keys', () => {
      const onToggleSelect = vi.fn()
      renderMedia({ onToggleSelect })
      const box = screen.getByRole('checkbox')
      fireEvent.keyDown(box, { key: 'Enter' })
      fireEvent.keyDown(box, { key: ' ' })
      fireEvent.keyDown(box, { key: 'a' })
      expect(onToggleSelect).toHaveBeenCalledTimes(2)
    })
  })
})
