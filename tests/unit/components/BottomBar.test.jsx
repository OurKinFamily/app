import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { BottomBar } from '../../../src/components/BottomBar'
import { renderWithRouter } from '../helpers'

// BottomBar uses useIsAdmin() from MeContext to conditionally show Manage.
const mockIsAdmin = vi.fn(() => false)
vi.mock('../../../src/contexts/MeContext', () => ({
  useIsAdmin: () => mockIsAdmin(),
}))

describe('BottomBar', () => {
  beforeEach(() => { mockIsAdmin.mockReturnValue(false) })

  describe('rendering (non-admin)', () => {
    it('renders public nav items', () => {
      renderWithRouter(<BottomBar />)
      for (const label of ['Gallery', 'People', 'Places', 'Family']) {
        expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument()
      }
    })
    it('hides Manage for non-admin', () => {
      renderWithRouter(<BottomBar />)
      expect(screen.queryByRole('link', { name: /Manage/ })).not.toBeInTheDocument()
    })
  })

  describe('rendering (admin)', () => {
    it('shows Manage for admin', () => {
      mockIsAdmin.mockReturnValue(true)
      renderWithRouter(<BottomBar />)
      expect(screen.getByRole('link', { name: /Manage/ })).toHaveAttribute('href', '/manage')
    })
  })

  describe('link targets', () => {
    it('points public links at correct routes', () => {
      renderWithRouter(<BottomBar />)
      expect(screen.getByRole('link', { name: /Gallery/ })).toHaveAttribute('href', '/gallery')
      expect(screen.getByRole('link', { name: /People/  })).toHaveAttribute('href', '/gallery/people')
      expect(screen.getByRole('link', { name: /Places/  })).toHaveAttribute('href', '/gallery/places')
    })
  })

  describe('active state (branch coverage)', () => {
    it('renders without throwing when a route is active', () => {
      expect(() => renderWithRouter(<BottomBar />, { route: '/gallery' })).not.toThrow()
    })
    it('renders without throwing when no route is active', () => {
      expect(() => renderWithRouter(<BottomBar />, { route: '/nowhere' })).not.toThrow()
    })
  })
})
