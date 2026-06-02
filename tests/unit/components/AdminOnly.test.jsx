import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes, MemoryRouter } from 'react-router-dom'
import { render } from '@testing-library/react'
import { AdminOnly } from '../../../src/components/AdminOnly'

// AdminOnly uses useMe() from MeContext — mock the hook directly so tests
// are synchronous (no fetch, no MeProvider needed).
const mockMe = vi.fn()
vi.mock('../../../src/contexts/MeContext', () => ({
  useMe: () => mockMe(),
}))

function makeMe({ isAdmin = false, loading = false } = {}) {
  return { isAdmin, loading }
}

// Render AdminOnly as a route guard (layout route wrapping a child route).
// The child route renders a sentinel so we can confirm whether it appeared.
function renderAsRouteGuard(meOverrides = {}, { route = '/admin' } = {}) {
  mockMe.mockReturnValue(makeMe(meOverrides))
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<AdminOnly />}>
          <Route path="/admin" element={<div>admin content</div>} />
        </Route>
        <Route path="/gallery" element={<div>gallery</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// Render AdminOnly as a UI guard with children.
function renderWithChildren(meOverrides = {}, children = <div>child content</div>) {
  mockMe.mockReturnValue(makeMe(meOverrides))
  return render(
    <MemoryRouter>
      <AdminOnly>{children}</AdminOnly>
    </MemoryRouter>
  )
}

describe('AdminOnly', () => {
  beforeEach(() => { mockMe.mockReset() })

  describe('while loading', () => {
    it('renders nothing (route guard mode)', () => {
      const { container } = renderAsRouteGuard({ loading: true })
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing (UI guard mode with children)', () => {
      const { container } = renderWithChildren({ loading: true })
      expect(container.firstChild).toBeNull()
    })
  })

  describe('non-admin user', () => {
    it('redirects to /gallery when used as a route guard (no children)', () => {
      renderAsRouteGuard({ isAdmin: false })
      // The redirect should land on the gallery route.
      expect(screen.getByText('gallery')).toBeInTheDocument()
      expect(screen.queryByText('admin content')).not.toBeInTheDocument()
    })

    it('renders nothing (not a redirect) when used as a UI guard with children', () => {
      const { container } = renderWithChildren({ isAdmin: false })
      expect(container.firstChild).toBeNull()
      expect(screen.queryByText('child content')).not.toBeInTheDocument()
    })
  })

  describe('admin user', () => {
    it('renders the nested Outlet when used as a route guard', () => {
      renderAsRouteGuard({ isAdmin: true })
      expect(screen.getByText('admin content')).toBeInTheDocument()
    })

    it('renders children when passed as a UI guard', () => {
      renderWithChildren({ isAdmin: true })
      expect(screen.getByText('child content')).toBeInTheDocument()
    })
  })
})
