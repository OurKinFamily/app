import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { SidebarNav } from '../../../src/components/SidebarNav'
import { renderWithRouter, mockFetch } from '../helpers'

// SidebarNav fetches /api/admin/me to decide whether to render the Admin
// + Tools groups. For tests that care about admin sections, mock the
// fetch to return Stephen's email; tests that probe the unauthenticated
// view mock it to return a non-admin email.
const ADMIN_ME = { email: 'stephenyoung7267@gmail.com', person: { id: 'p1', name: 'Stephen' } }
const GUEST_ME = { email: 'cayce@example.com', person: { id: 'p2', name: 'Cayce' } }

async function renderAsAdmin() {
  mockFetch(ADMIN_ME)
  renderWithRouter(<SidebarNav />)
  // Wait for the /me effect to flush so admin sections appear.
  await waitFor(() => expect(screen.getByText('Admin')).toBeInTheDocument())
}

describe('SidebarNav', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  describe('section headings (admin user)', () => {
    it.each([['Our Kin'], ['Manage'], ['Admin'], ['Tools']])('renders the %s section', async heading => {
      await renderAsAdmin()
      expect(screen.getByText(heading)).toBeInTheDocument()
    })
  })

  describe('section headings (non-admin user)', () => {
    it('hides Admin + Tools when /me returns a non-admin email', async () => {
      mockFetch(GUEST_ME)
      renderWithRouter(<SidebarNav />)
      // Public groups always render. Admin sections render once /me resolves
      // to an admin email — we wait long enough to be sure they wouldn't show.
      await waitFor(() => expect(screen.getByText('Our Kin')).toBeInTheDocument())
      expect(screen.queryByText('Admin')).not.toBeInTheDocument()
      expect(screen.queryByText('Tools')).not.toBeInTheDocument()
    })

    it('hides Admin + Tools when /me fetch fails', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'))
      renderWithRouter(<SidebarNav />)
      await waitFor(() => expect(screen.getByText('Our Kin')).toBeInTheDocument())
      expect(screen.queryByText('Admin')).not.toBeInTheDocument()
    })
  })

  describe('links (admin user)', () => {
    it.each([
      ['Gallery',          '/gallery'],
      ['Places',           '/gallery/places'],
      ['People',           '/gallery/people'],
      ['Albums',           '/gallery/albums'],
      ['Favorites',        '/gallery/favorites'],
      ['Unassigned faces', '/manage/faces/unassigned'],
      ['Assigned faces',   '/manage/faces/assigned'],
      ['Confirm faces',    '/manage/faces/confirm'],
      ['Groups',           '/manage/groups'],
      ['Suggestions',      '/manage/suggestions'],
      ['Overview (legacy)', '/admin/overview'],
      ['Analytics',         '/admin/filesystem'],
      ['Health',            '/admin/health'],
      ['Mosaic',            '/admin/mosaic'],
      ['Jobs',              '/admin/jobs'],
      ['Design',           '/design'],
    ])('renders the %s link pointing at %s', async (label, href) => {
      await renderAsAdmin()
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
    })
  })

  describe('active state (branch coverage)', () => {
    it('renders without throwing when one of the routes is active', async () => {
      mockFetch(ADMIN_ME)
      expect(() => renderWithRouter(<SidebarNav />, { route: '/gallery' })).not.toThrow()
    })
    it('renders without throwing when no route is active', async () => {
      mockFetch(ADMIN_ME)
      expect(() => renderWithRouter(<SidebarNav />, { route: '/nowhere' })).not.toThrow()
    })
  })
})
