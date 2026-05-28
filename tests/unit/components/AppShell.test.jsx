import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from '../../../src/components/AppShell'

describe('AppShell', () => {
  describe('slot rendering', () => {
    it('renders the children inside <main>', () => {
      const { container } = render(<AppShell><span data-testid="body">x</span></AppShell>)
      expect(container.querySelector('main')).not.toBe(null)
      expect(screen.getByTestId('body')).toBeInTheDocument()
    })
    it('renders the header slot when provided', () => {
      render(<AppShell header={<header data-testid="h">hdr</header>}>x</AppShell>)
      expect(screen.getByTestId('h')).toBeInTheDocument()
    })
    it('omits the header slot when no header is given', () => {
      render(<AppShell>x</AppShell>)
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    })
    it('renders the sidebar inside an <aside> when provided and not hidden', () => {
      const { container } = render(
        <AppShell sidebar={<span data-testid="side">nav</span>}>x</AppShell>
      )
      expect(container.querySelector('aside')).not.toBe(null)
      expect(screen.getByTestId('side')).toBeInTheDocument()
    })
    it('hides the sidebar when sidebarHidden is true', () => {
      const { container } = render(
        <AppShell sidebar={<span>nav</span>} sidebarHidden>x</AppShell>
      )
      expect(container.querySelector('aside')).toBe(null)
    })
    it('renders the bottomBar slot when provided', () => {
      render(<AppShell bottomBar={<span data-testid="bb">bb</span>}>x</AppShell>)
      expect(screen.getByTestId('bb')).toBeInTheDocument()
    })
    it('omits the bottomBar slot when none is given', () => {
      render(<AppShell>x</AppShell>)
      expect(screen.queryByTestId('bb')).not.toBeInTheDocument()
    })
  })
})
