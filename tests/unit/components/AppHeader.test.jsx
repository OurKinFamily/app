import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { AppHeader } from '../../../src/components/AppHeader'
import { renderWithRouter, mockFetch } from '../helpers'

describe('AppHeader', () => {
  beforeEach(() => { vi.resetAllMocks() })

  describe('home link', () => {
    it('renders an OK link to /', () => {
      mockFetch(null, { ok: false })
      renderWithRouter(<AppHeader />)
      const home = screen.getByRole('link', { name: /OK/ })
      expect(home).toHaveAttribute('href', '/')
    })
  })

  describe('user identity', () => {
    it('shows the user\'s known_as when present, linking to their person page', async () => {
      mockFetch({ person: { id: 'p1', name: 'Stephen E. Young', known_as: 'Stephen' } })
      renderWithRouter(<AppHeader />)
      await waitFor(() => expect(screen.getByText('Stephen')).toBeInTheDocument())
      const link = screen.getByRole('link', { name: 'Stephen' })
      expect(link).toHaveAttribute('href', '/manage/people/p1')
    })
    it('falls back to the first word of the full name when known_as is missing', async () => {
      mockFetch({ person: { id: 'p1', name: 'Stephen E. Young' } })
      renderWithRouter(<AppHeader />)
      await waitFor(() => expect(screen.getByText('Stephen')).toBeInTheDocument())
    })
    it('renders the name as plain text (no link) when no person id is returned', async () => {
      mockFetch({ person: { name: 'Stephen', known_as: 'Stephen' } })
      renderWithRouter(<AppHeader />)
      await waitFor(() => expect(screen.getByText('Stephen')).toBeInTheDocument())
      // No /manage/people/* link should exist.
      expect(screen.queryByRole('link', { name: 'Stephen' })).not.toBeInTheDocument()
    })
    it('omits the name slot entirely when /api/admin/me returns nothing', async () => {
      mockFetch(null, { ok: false })
      renderWithRouter(<AppHeader />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      // OK link still present; no extra link from a user name.
      expect(screen.getAllByRole('link').length).toBe(1)
    })
    it('survives a fetch rejection without throwing', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('net'))
      expect(() => renderWithRouter(<AppHeader />)).not.toThrow()
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    })
    it('falls back to empty title when person.name is null', async () => {
      // Hits the `|| ''` branch on line 30 (title fallback).
      mockFetch({ person: { id: 'p1', known_as: 'Stephen' } })
      renderWithRouter(<AppHeader />)
      await waitFor(() => expect(screen.getByText('Stephen')).toBeInTheDocument())
      expect(screen.getByRole('link', { name: 'Stephen' })).toHaveAttribute('title', '')
    })
  })

  describe('mobile menu button', () => {
    it('renders a hamburger when onMenu is provided', () => {
      mockFetch(null, { ok: false })
      renderWithRouter(<AppHeader onMenu={() => {}} />)
      expect(screen.getByRole('button', { name: 'Toggle menu' })).toBeInTheDocument()
    })
    it('invokes onMenu on click', () => {
      const onMenu = vi.fn()
      mockFetch(null, { ok: false })
      renderWithRouter(<AppHeader onMenu={onMenu} />)
      screen.getByRole('button', { name: 'Toggle menu' }).click()
      expect(onMenu).toHaveBeenCalledTimes(1)
    })
    it('omits the hamburger when no onMenu handler is given', () => {
      mockFetch(null, { ok: false })
      renderWithRouter(<AppHeader />)
      expect(screen.queryByRole('button', { name: 'Toggle menu' })).not.toBeInTheDocument()
    })
  })
})
