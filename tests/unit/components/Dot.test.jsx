import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dot } from '../../../src/components/Dot'

describe('Dot', () => {
  it('renders its children', () => {
    render(<Dot><span data-testid="wrapped">hi</span></Dot>)
    expect(screen.getByTestId('wrapped')).toBeInTheDocument()
  })

  describe('show flag', () => {
    it('renders the indicator dot by default', () => {
      const { container } = render(<Dot><span>x</span></Dot>)
      // The dot is a span with aria-hidden="true"; querying directly avoids
      // depending on class names.
      expect(container.querySelector('[aria-hidden="true"]')).not.toBe(null)
    })
    it('hides the indicator when show=false', () => {
      const { container } = render(<Dot show={false}><span>x</span></Dot>)
      expect(container.querySelector('[aria-hidden="true"]')).toBe(null)
    })
  })

  describe('prop variants (branch coverage)', () => {
    // We don't assert on the rendered class names (visual concern) — these
    // tests exist so each prop branch executes, catching syntax / runtime
    // regressions in those branches.
    it.each([['sm'], ['md'], ['lg']])('renders without throwing at size=%s', size => {
      expect(() => render(<Dot size={size}>x</Dot>)).not.toThrow()
    })
    it.each([['red'], ['yellow'], ['green'], ['blue'], ['white']])(
      'renders without throwing for known color=%s',
      color => {
        expect(() => render(<Dot color={color}>x</Dot>)).not.toThrow()
      },
    )
    it('falls back gracefully when given an unknown color', () => {
      expect(() => render(<Dot color="mystery">x</Dot>)).not.toThrow()
    })
  })
})
