import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { SidebarNav } from '../../../src/components/SidebarNav'
import { renderWithRouter } from '../helpers'

// SidebarNav uses useMe() from MeContext (isAdmin + me.can_see_gallery). Mock the
// hook directly so tests are synchronous — no fetch mocking or waitFor needed.
const mockMe = vi.fn(() => ({ isAdmin: false, me: { can_see_gallery: false } }))
vi.mock('../../../src/contexts/MeContext', () => ({
  useMe: () => mockMe(),
}))

function renderAsAdmin() {
  mockMe.mockReturnValue({ isAdmin: true, me: { can_see_gallery: true } })
  renderWithRouter(<SidebarNav />)
}

function renderAsGuest() {
  mockMe.mockReturnValue({ isAdmin: false, me: { can_see_gallery: false } })
  renderWithRouter(<SidebarNav />)
}

// Cayce tier: not admin, but may see the gallery.
function renderAsGalleryViewer() {
  mockMe.mockReturnValue({ isAdmin: false, me: { can_see_gallery: true } })
  renderWithRouter(<SidebarNav />)
}

describe('SidebarNav', () => {
  beforeEach(() => { mockMe.mockReturnValue({ isAdmin: false, me: { can_see_gallery: false } }) })

  describe('section headings (admin user)', () => {
    it.each([['Our Kin'], ['Manage'], ['Admin'], ['Tools']])('renders the %s section', heading => {
      renderAsAdmin()
      expect(screen.getByText(heading)).toBeInTheDocument()
    })
  })

  describe('section headings (non-admin user)', () => {
    it('shows Our Kin and hides Manage, Admin, Tools', () => {
      renderAsGuest()
      expect(screen.getByText('Our Kin')).toBeInTheDocument()
      expect(screen.queryByText('Manage')).not.toBeInTheDocument()
      expect(screen.queryByText('Admin')).not.toBeInTheDocument()
      expect(screen.queryByText('Tools')).not.toBeInTheDocument()
    })
  })

  describe('links (admin user)', () => {
    it.each([
      ['Gallery',           '/gallery'],
      ['Places',            '/gallery/places'],
      ['People',            '/gallery/people'],
      ['Albums',            '/gallery/albums'],
      ['Favorites',         '/gallery/favorites'],
      ['Unassigned faces',  '/manage/faces/unassigned'],
      ['Assigned faces',    '/manage/faces/assigned'],
      ['Groups',            '/manage/groups'],
      ['Suggestions',       '/manage/suggestions'],
      ['Overview (legacy)', '/admin/overview'],
      ['Analytics',         '/admin/filesystem'],
      ['Health',            '/admin/health'],
      ['Mosaic',            '/admin/mosaic'],
      ['Jobs',              '/admin/jobs'],
      ['Design',            '/design'],
    ])('renders the %s link pointing at %s', (label, href) => {
      renderAsAdmin()
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
    })
  })

  describe('item-level gating', () => {
    it('hides Search/Albums/Favorites and Gallery/Places from a plain family viewer', () => {
      renderAsGuest()
      for (const label of ['Search', 'Albums', 'Favorites', 'Gallery', 'Places']) {
        expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
      }
      // curated family items remain
      expect(screen.getByRole('link', { name: 'People' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Biographies' })).toBeInTheDocument()
    })
    it('shows Gallery/Places to a gallery viewer (Cayce) but still hides admin-only items', () => {
      renderAsGalleryViewer()
      expect(screen.getByRole('link', { name: 'Gallery' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Places' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Search' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Albums' })).not.toBeInTheDocument()
    })
  })

  describe('active state (branch coverage)', () => {
    it('renders without throwing when a route is active', () => {
      renderAsAdmin()
      expect(() => renderWithRouter(<SidebarNav />, { route: '/gallery' })).not.toThrow()
    })
    it('renders without throwing when no route is active', () => {
      renderAsAdmin()
      expect(() => renderWithRouter(<SidebarNav />, { route: '/nowhere' })).not.toThrow()
    })
  })
})
