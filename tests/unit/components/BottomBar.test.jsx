import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { BottomBar } from '../../../src/components/BottomBar'
import { renderWithRouter } from '../helpers'

// BottomBar uses useMe() — isAdmin (Manage) + me.can_see_gallery (Gallery/Places).
const mockMe = vi.fn(() => ({ isAdmin: false, me: { can_see_gallery: false } }))
vi.mock('../../../src/contexts/MeContext', () => ({
  useMe: () => mockMe(),
}))
const asGallery = () => mockMe.mockReturnValue({ isAdmin: false, me: { can_see_gallery: true } })
const asAdmin   = () => mockMe.mockReturnValue({ isAdmin: true,  me: { can_see_gallery: true } })

describe('BottomBar', () => {
  beforeEach(() => { mockMe.mockReturnValue({ isAdmin: false, me: { can_see_gallery: false } }) })

  describe('rendering (gallery viewer)', () => {
    it('renders all public nav items', () => {
      asGallery()
      renderWithRouter(<BottomBar />)
      for (const label of ['Gallery', 'People', 'Places', 'Family']) {
        expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument()
      }
    })
  })

  describe('rendering (plain family — no gallery)', () => {
    it('shows People/Family but hides Gallery/Places and Manage', () => {
      renderWithRouter(<BottomBar />)
      expect(screen.getByRole('link', { name: /People/ })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Family/ })).toBeInTheDocument()
      for (const label of ['Gallery', 'Places', 'Manage']) {
        expect(screen.queryByRole('link', { name: new RegExp(label) })).not.toBeInTheDocument()
      }
    })
  })

  describe('rendering (admin)', () => {
    it('shows Manage for admin', () => {
      asAdmin()
      renderWithRouter(<BottomBar />)
      expect(screen.getByRole('link', { name: /Manage/ })).toHaveAttribute('href', '/manage')
    })
  })

  describe('link targets', () => {
    it('points public links at correct routes', () => {
      asGallery()
      renderWithRouter(<BottomBar />)
      expect(screen.getByRole('link', { name: /Gallery/ })).toHaveAttribute('href', '/gallery')
      expect(screen.getByRole('link', { name: /People/  })).toHaveAttribute('href', '/gallery/people')
      expect(screen.getByRole('link', { name: /Places/  })).toHaveAttribute('href', '/gallery/places')
    })
  })

  describe('active state (branch coverage)', () => {
    it('renders without throwing when a route is active', () => {
      asGallery()  // so the active /gallery link is actually rendered (active branch)
      expect(() => renderWithRouter(<BottomBar />, { route: '/gallery' })).not.toThrow()
    })
    it('renders without throwing when no route is active', () => {
      asGallery()
      expect(() => renderWithRouter(<BottomBar />, { route: '/nowhere' })).not.toThrow()
    })
  })
})
