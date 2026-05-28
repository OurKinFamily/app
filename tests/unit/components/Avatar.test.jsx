import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from '../../../src/components/Avatar'

describe('Avatar', () => {
  it('renders an <img> when a src is provided', () => {
    render(<Avatar src="/avatar.jpg" name="Stephen E. Young" />)
    const img = screen.getByAltText('Stephen E. Young')
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src', '/avatar.jpg')
  })

  it('falls back to initials when no src is given', () => {
    render(<Avatar name="Stephen E. Young" />)
    // First letter of the first TWO whitespace-separated words → "SE".
    expect(screen.getByText('SE')).toBeInTheDocument()
  })

  it('handles single-word names', () => {
    render(<Avatar name="Cayce" />)
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('renders an empty initials block for a missing name', () => {
    const { container } = render(<Avatar />)
    expect(container.firstChild?.textContent).toBe('')
  })

  it('falls back gracefully when given an unknown size', () => {
    // Hits the `SIZES[size] || SIZES.md` branch.
    expect(() => render(<Avatar name="x" size="mystery" />)).not.toThrow()
  })
})
