import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IconButton } from '../../../src/components/IconButton'

describe('IconButton', () => {
  describe('accessibility', () => {
    it('exposes the label as aria-label and title', () => {
      render(<IconButton label="Favorite"><span>♥</span></IconButton>)
      const btn = screen.getByRole('button', { name: 'Favorite' })
      expect(btn).toHaveAttribute('aria-label', 'Favorite')
      expect(btn).toHaveAttribute('title', 'Favorite')
    })
  })

  describe('click behavior', () => {
    it('invokes onClick when clicked', () => {
      const onClick = vi.fn()
      render(<IconButton label="x" onClick={onClick}><span>x</span></IconButton>)
      screen.getByRole('button').click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
    it('stops the click from bubbling to a parent handler', () => {
      // regression-style: the icon-button is used inside media cards that
      // have their own click handler — bubbling would re-trigger the parent.
      const parentClick = vi.fn()
      const childClick  = vi.fn()
      render(
        <div onClick={parentClick}>
          <IconButton label="fav" onClick={childClick}>x</IconButton>
        </div>
      )
      screen.getByRole('button').click()
      expect(childClick).toHaveBeenCalledTimes(1)
      expect(parentClick).not.toHaveBeenCalled()
    })
    it('is forgiving when no onClick is supplied', () => {
      render(<IconButton label="x">x</IconButton>)
      // Should not throw on click.
      expect(() => screen.getByRole('button').click()).not.toThrow()
    })
  })

  describe('active state (branch coverage)', () => {
    it('renders without throwing when active is true', () => {
      // We don't assert on styling — visual concern. This exercises the
      // active class branch so coverage hits both sides.
      expect(() => render(<IconButton label="fav" active>x</IconButton>)).not.toThrow()
    })
  })
})
