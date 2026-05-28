import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MediaCard, MediaRow } from '../../../src/components/MediaCard'

describe('MediaCard', () => {
  describe('cover rendering', () => {
    it('renders cover images (background + foreground) when cover is provided', () => {
      const { container } = render(<MediaCard cover="/c.jpg" text="x" />)
      const imgs = container.querySelectorAll('img[src="/c.jpg"]')
      expect(imgs.length).toBe(2)  // background blur + main contain
    })
    it('falls back to the icon when no cover is given', () => {
      render(<MediaCard text="x" icon={<span data-testid="ico">★</span>} />)
      expect(screen.getByTestId('ico')).toBeInTheDocument()
    })
    it('overlays the icon on top of the cover when both are given', () => {
      render(<MediaCard text="x" cover="/c.jpg" icon={<span data-testid="ico">★</span>} />)
      expect(screen.getByTestId('ico')).toBeInTheDocument()
    })
    it('renders the optional coverBadge', () => {
      render(<MediaCard text="x" coverBadge="PRIVATE" />)
      expect(screen.getByText('PRIVATE')).toBeInTheDocument()
    })
  })

  describe('body content', () => {
    it('renders the text prop', () => {
      render(<MediaCard text="Wedding 2024" />)
      expect(screen.getByText('Wedding 2024')).toBeInTheDocument()
    })
    it('renders subtitle, description, and trailing when provided', () => {
      render(<MediaCard text="x" subtitle="sub" description="desc" trailing="trail" />)
      expect(screen.getByText('sub')).toBeInTheDocument()
      expect(screen.getByText('desc')).toBeInTheDocument()
      expect(screen.getByText('trail')).toBeInTheDocument()
    })
  })

  describe('clickability', () => {
    it('renders a button when onClick is given and fires it on click', () => {
      const onClick = vi.fn()
      render(<MediaCard text="x" onClick={onClick} />)
      screen.getByRole('button', { name: /x/ }).click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })
})

describe('MediaRow', () => {
  describe('cover slot', () => {
    it('renders the cover image when provided', () => {
      const { container } = render(<MediaRow cover="/c.jpg" text="x" />)
      expect(container.querySelector('img[src="/c.jpg"]')).not.toBe(null)
    })
    it('falls back to the icon when no cover is given', () => {
      render(<MediaRow text="x" icon={<span data-testid="ico">★</span>} />)
      expect(screen.getByTestId('ico')).toBeInTheDocument()
    })
  })

  describe('body content', () => {
    it('renders subtitle and description joined with a separator', () => {
      render(<MediaRow text="x" subtitle="sub" description="desc" />)
      expect(screen.getByText('sub')).toBeInTheDocument()
      expect(screen.getByText('desc')).toBeInTheDocument()
    })
    it('renders only subtitle when description is missing', () => {
      render(<MediaRow text="x" subtitle="sub" />)
      expect(screen.getByText('sub')).toBeInTheDocument()
    })
    it('renders only description when subtitle is missing', () => {
      render(<MediaRow text="x" description="desc" />)
      expect(screen.getByText('desc')).toBeInTheDocument()
    })
    it('omits the secondary line when both subtitle and description are missing', () => {
      const { container } = render(<MediaRow text="just text" />)
      // Body span contains only the text.
      expect(container.textContent.trim()).toBe('just text')
    })
  })

  describe('trailing slot', () => {
    it('renders explicit trailing when provided', () => {
      render(<MediaRow text="x" trailing="trail" />)
      expect(screen.getByText('trail')).toBeInTheDocument()
    })
    it('falls back to coverBadge when trailing is not provided', () => {
      render(<MediaRow text="x" coverBadge="badge" />)
      expect(screen.getByText('badge')).toBeInTheDocument()
    })
    it('renders neither when both are missing', () => {
      const { container } = render(<MediaRow text="x" />)
      // No trailing span — just the cover + body.
      expect(container.querySelectorAll('span').length).toBeLessThan(5)
    })
  })

  describe('clickability', () => {
    it('renders a button + fires onClick', () => {
      const onClick = vi.fn()
      render(<MediaRow text="x" onClick={onClick} />)
      screen.getByRole('button', { name: /x/ }).click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })
})
