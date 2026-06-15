import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MainLayout } from '../../../src/components/MainLayout'
import { mockFetch } from '../helpers'

function renderLayout(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path={route} element={<span data-testid="page">page</span>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('MainLayout', () => {
  beforeEach(() => {
    mockFetch(null, { ok: false })  // AppHeader's /api/admin/me call
    localStorage.clear()
  })
  afterEach(() => { localStorage.clear() })

  describe('basic rendering', () => {
    it('renders the matched route inside the Outlet', () => {
      renderLayout('/')
      expect(screen.getByTestId('page')).toBeInTheDocument()
    })
    it('mounts AppHeader (the OK home link is visible)', () => {
      renderLayout('/')
      expect(screen.getByRole('link', { name: /OK/ })).toBeInTheDocument()
    })
    it('mounts BottomBar + SidebarNav (multiple People links exist)', () => {
      renderLayout('/')
      // Both BottomBar and SidebarNav render a People link (ungated) — count > 1
      // confirms both nav components mounted. (Gallery is now gallery-tier-gated,
      // so it isn't a reliable "both mounted" signal for a null/family viewer.)
      expect(screen.getAllByRole('link', { name: /People/ }).length).toBeGreaterThan(1)
    })
    it('renders a hamburger button via AppHeader\'s onMenu prop', () => {
      renderLayout('/')
      expect(screen.getByRole('button', { name: 'Toggle menu' })).toBeInTheDocument()
    })
  })

  describe('mobile drawer', () => {
    it('exposes a Close-menu button for the drawer', () => {
      renderLayout('/')
      expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument()
    })
    it('toggling the hamburger on mobile triggers the drawer (no throw)', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
      renderLayout('/')
      expect(() => screen.getByRole('button', { name: 'Toggle menu' }).click()).not.toThrow()
    })
    it('clicking the Close-menu button closes the drawer', () => {
      renderLayout('/')
      expect(() => screen.getByRole('button', { name: 'Close menu' }).click()).not.toThrow()
    })
    it('clicking inside the drawer content triggers closeDrawer', () => {
      renderLayout('/')
      // Find the drawer-specific SidebarNav wrapper (the div with the
      // px-3.pb-6 classes used by closeDrawer onClick).
      const closeBtn = screen.getByRole('button', { name: 'Close menu' })
      const drawerNavWrapper = closeBtn.closest('div[class*="translate-x"]').querySelector('div.min-h-0.flex-1')
      expect(drawerNavWrapper).not.toBeNull()
      fireEvent.click(drawerNavWrapper)
    })
    it('clicking the drawer backdrop closes it', () => {
      renderLayout('/')
      // Backdrop = outermost fixed.inset-0 wrapper. Walk up from the Close
      // button to find it.
      const closeBtn = screen.getByRole('button', { name: 'Close menu' })
      const backdrop = closeBtn.closest('div.fixed')
      expect(backdrop).not.toBeNull()
      fireEvent.click(backdrop)
    })
    it('clicking inside the drawer panel does not bubble to backdrop close', () => {
      renderLayout('/')
      // Panel is the parent of Close button's container.
      const closeBtn = screen.getByRole('button', { name: 'Close menu' })
      const panel = closeBtn.parentElement.parentElement
      expect(panel).not.toBeNull()
      fireEvent.click(panel)
    })
  })

  describe('desktop sidebar persistence', () => {
    it('reads the persisted hidden flag from localStorage on mount', () => {
      localStorage.setItem('desktop-sidebar-hidden', '1')
      expect(() => renderLayout('/')).not.toThrow()
    })
    it('toggling on desktop flips the persisted flag', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
      renderLayout('/')
      act(() => { screen.getByRole('button', { name: 'Toggle menu' }).click() })
      expect(localStorage.getItem('desktop-sidebar-hidden')).toBe('1')
    })
  })

  describe('ResizeObserver wiring', () => {
    it('publishes --app-header-h on :root and cleans it up on unmount', () => {
      // Our setup.js stubs ResizeObserver to a no-op, so the effect's
      // observe/disconnect run but no entries fire. We can still verify the
      // property is *cleared* on unmount, which exercises the cleanup branch.
      const { unmount } = renderLayout('/')
      document.documentElement.style.setProperty('--app-header-h', '99px')
      unmount()
      expect(document.documentElement.style.getPropertyValue('--app-header-h')).toBe('')
    })
    it('writes the measured header height to --app-header-h when the observer fires', () => {
      // Replace the stub with a firing observer so the callback runs.
      const real = globalThis.ResizeObserver
      globalThis.ResizeObserver = class {
        constructor(cb) { this.cb = cb }
        observe()    { this.cb([{ contentRect: { height: 87.4 } }]) }
        unobserve()  {}
        disconnect() {}
      }
      renderLayout('/')
      expect(document.documentElement.style.getPropertyValue('--app-header-h')).toBe('87px')
      globalThis.ResizeObserver = real
    })
  })
})
