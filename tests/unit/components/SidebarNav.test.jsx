import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { SidebarNav } from '../../../src/components/SidebarNav'
import { renderWithRouter } from '../helpers'

// SidebarNav uses useIsAdmin() from MeContext. Mock the hook directly so
// tests are synchronous — no fetch mocking or waitFor needed.
const mockIsAdmin = vi.fn(() => false)
vi.mock('../../../src/contexts/MeContext', () => ({
  useIsAdmin: () => mockIsAdmin(),
}))

function renderAsAdmin() {
  mockIsAdmin.mockReturnValue(true)
  renderWithRouter(<SidebarNav />)
}

function renderAsGuest() {
  mockIsAdmin.mockReturnValue(false)
  renderWithRouter(<SidebarNav />)
}

describe('SidebarNav', () => {
  beforeEach(() => { mockIsAdmin.mockReturnValue(false) })

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
      ['Confirm faces',     '/manage/faces/confirm'],
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

  describe('active state (branch coverage)', () => {
    it('renders without throwing when a route is active', () => {
      mockIsAdmin.mockReturnValue(true)
      expect(() => renderWithRouter(<SidebarNav />, { route: '/gallery' })).not.toThrow()
    })
    it('renders without throwing when no route is active', () => {
      mockIsAdmin.mockReturnValue(true)
      expect(() => renderWithRouter(<SidebarNav />, { route: '/nowhere' })).not.toThrow()
    })
  })
})
