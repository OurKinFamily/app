import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from '../../../src/components/ProgressBar'

describe('ProgressBar', () => {
  describe('pct value handling', () => {
    function fill(container) {
      // The fill bar is the inner div with an inline width style. Querying by
      // [style*="width"] keeps the test off class names.
      return container.querySelector('[style*="width"]')
    }

    it('renders the supplied pct as a width %', () => {
      const { container } = render(<ProgressBar pct={42} />)
      expect(fill(container)).toHaveStyle({ width: '42%' })
    })
    it('clamps pct to a minimum of 0', () => {
      const { container } = render(<ProgressBar pct={-50} />)
      expect(fill(container)).toHaveStyle({ width: '0%' })
    })
    it('clamps pct to a maximum of 100', () => {
      const { container } = render(<ProgressBar pct={250} />)
      expect(fill(container)).toHaveStyle({ width: '100%' })
    })
    it('treats missing/undefined pct as 0', () => {
      const { container } = render(<ProgressBar />)
      expect(fill(container)).toHaveStyle({ width: '0%' })
    })
  })

  describe('showPct pill', () => {
    it('shows a pct pill rounded to one decimal when showPct is set', () => {
      render(<ProgressBar pct={42.333} showPct />)
      expect(screen.getByText('42.3%')).toBeInTheDocument()
    })
    it('omits the pct pill when showPct is unset', () => {
      render(<ProgressBar pct={42} />)
      expect(screen.queryByText('42.0%')).not.toBeInTheDocument()
    })
  })

  describe('showCounts pill', () => {
    it('renders "<cur> / <tot>" with thousand separators', () => {
      render(<ProgressBar pct={50} showCounts cur={1234} tot={12345} />)
      expect(screen.getByText('1,234 / 12,345')).toBeInTheDocument()
    })
    it('omits the counts pill when cur or tot is missing', () => {
      const { container } = render(<ProgressBar pct={50} showCounts cur={1234} />)
      expect(container.textContent).not.toMatch(/\/ \d/)
    })
  })

  describe('prop variants (branch coverage)', () => {
    // Exercise every tone + size branch. We don't assert styling — these
    // tests catch syntax/runtime regressions in each branch.
    it.each([['blue'], ['green'], ['amber'], ['red'], ['purple']])(
      'renders without throwing for tone=%s',
      tone => {
        expect(() => render(<ProgressBar pct={50} tone={tone} />)).not.toThrow()
      },
    )
    it.each([['sm'], ['md'], ['lg']])('renders without throwing for size=%s', size => {
      expect(() => render(<ProgressBar pct={50} size={size} />)).not.toThrow()
    })
    it('falls back gracefully for an unknown tone', () => {
      expect(() => render(<ProgressBar pct={50} tone="mystery" />)).not.toThrow()
    })
    it('falls back gracefully for an unknown size', () => {
      expect(() => render(<ProgressBar pct={50} size="mystery" />)).not.toThrow()
    })
  })
})
