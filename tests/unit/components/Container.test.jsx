import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Container } from '../../../src/components/Container'

describe('Container', () => {
  it('renders its children', () => {
    render(<Container>hello world</Container>)
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('forwards an extra className alongside the defaults', () => {
    // We don't assert on Tailwind classes (visual concern) — only that the
    // consumer-supplied class string actually reaches the rendered element
    // so callers can override layout where needed.
    const { container } = render(<Container className="custom-marker">x</Container>)
    expect(container.firstChild?.className).toContain('custom-marker')
  })
})
