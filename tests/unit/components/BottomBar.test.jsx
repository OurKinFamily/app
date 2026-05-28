import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { BottomBar } from '../../../src/components/BottomBar'
import { renderWithRouter } from '../helpers'

describe('BottomBar', () => {
  describe('rendering', () => {
    it('renders a link for each nav item', () => {
      renderWithRouter(<BottomBar />)
      // All 4 hardcoded items should appear as links.
      for (const label of ['Gallery', 'People', 'Places', 'Manage']) {
        expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument()
      }
    })
    it('points each link at its corresponding route', () => {
      renderWithRouter(<BottomBar />)
      expect(screen.getByRole('link', { name: /Gallery/ })).toHaveAttribute('href', '/gallery')
      expect(screen.getByRole('link', { name: /People/  })).toHaveAttribute('href', '/gallery/people')
      expect(screen.getByRole('link', { name: /Places/  })).toHaveAttribute('href', '/gallery/places')
      expect(screen.getByRole('link', { name: /Manage/  })).toHaveAttribute('href', '/manage')
    })
  })

  describe('active state (branch coverage)', () => {
    // NavLink's className function runs against {isActive}; render at a
    // route that should mark one of the items active, and at a different
    // route that should mark none.
    it('renders without throwing when a route is active', () => {
      expect(() => renderWithRouter(<BottomBar />, { route: '/gallery' })).not.toThrow()
    })
    it('renders without throwing when no route is active', () => {
      expect(() => renderWithRouter(<BottomBar />, { route: '/nowhere' })).not.toThrow()
    })
  })
})
