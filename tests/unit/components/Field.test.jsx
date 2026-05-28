import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field } from '../../../src/components/Field'

describe('Field', () => {
  describe('rendering', () => {
    it('shows the label and the value', () => {
      render(<Field label="Born" value="April 14, 1986" />)
      expect(screen.getByText('Born')).toBeInTheDocument()
      expect(screen.getByText('April 14, 1986')).toBeInTheDocument()
    })
    it('renders the optional icon node next to the value', () => {
      render(<Field label="x" value="y" icon={<span data-testid="ico">★</span>} />)
      expect(screen.getByTestId('ico')).toBeInTheDocument()
    })
  })

  describe('empty-value handling', () => {
    it('renders nothing when value is null', () => {
      const { container } = render(<Field label="x" value={null} />)
      expect(container.firstChild).toBe(null)
    })
    it('renders nothing when value is undefined', () => {
      const { container } = render(<Field label="x" value={undefined} />)
      expect(container.firstChild).toBe(null)
    })
    it('renders nothing when value is an empty string', () => {
      const { container } = render(<Field label="x" value="" />)
      expect(container.firstChild).toBe(null)
    })
    it('still renders when value is 0', () => {
      // The empty check is `== null || === ''`, deliberately NOT falsy-based,
      // so legitimate zero values (e.g. "0 photos") show up.
      render(<Field label="Photos" value={0} />)
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })
})
