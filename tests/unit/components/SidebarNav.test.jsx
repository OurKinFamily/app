import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { SidebarNav } from '../../../src/components/SidebarNav'
import { renderWithRouter } from '../helpers'

describe('SidebarNav', () => {
  describe('section headings', () => {
    it.each([['Our Kin'], ['Manage'], ['Admin'], ['Tools']])('renders the %s section', heading => {
      renderWithRouter(<SidebarNav />)
      expect(screen.getByText(heading)).toBeInTheDocument()
    })
  })

  describe('links', () => {
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
    ])('renders the %s link pointing at %s', (label, href) => {
      renderWithRouter(<SidebarNav />)
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
    })
  })

  describe('active state (branch coverage)', () => {
    it('renders without throwing when one of the routes is active', () => {
      expect(() => renderWithRouter(<SidebarNav />, { route: '/gallery' })).not.toThrow()
    })
    it('renders without throwing when no route is active', () => {
      expect(() => renderWithRouter(<SidebarNav />, { route: '/nowhere' })).not.toThrow()
    })
  })
})
