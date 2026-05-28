import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tag } from '../../../src/components/Tag'

describe('Tag', () => {
  it('renders its children', () => {
    render(<Tag>hello</Tag>)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('renders children in the plain variant too', () => {
    render(<Tag variant="plain">err</Tag>)
    expect(screen.getByText('err')).toBeInTheDocument()
  })

  it('applies a custom color via inline style', () => {
    render(<Tag color="#ff00aa">custom</Tag>)
    expect(screen.getByText('custom')).toHaveStyle({ color: '#ff00aa' })
  })

  it('applies a custom color via inline style in plain variant', () => {
    render(<Tag color="#00ff00" variant="plain">custom</Tag>)
    expect(screen.getByText('custom')).toHaveStyle({ color: '#00ff00' })
  })

  describe('prop variants (branch coverage)', () => {
    // Visual differences are not asserted (banned); this just exercises
    // each tone + variant branch.
    it.each([
      ['default'], ['green'], ['amber'], ['red'], ['blue'],
      ['purple'], ['pink'], ['orange'], ['slate'], ['cyan'],
    ])('renders without throwing for tone=%s', tone => {
      expect(() => render(<Tag tone={tone}>x</Tag>)).not.toThrow()
    })
    it('falls back gracefully for an unknown tone in pill variant', () => {
      expect(() => render(<Tag tone="mystery">x</Tag>)).not.toThrow()
    })
    it('falls back gracefully for an unknown tone in plain variant', () => {
      expect(() => render(<Tag tone="mystery" variant="plain">x</Tag>)).not.toThrow()
    })
  })
})
