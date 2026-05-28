import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Swatch } from '../../../src/components/Swatch'

describe('Swatch', () => {
  describe('rendering', () => {
    it('shows the label and the hex value', () => {
      render(<Swatch color="#ff00aa" label="dominant" />)
      expect(screen.getByText('dominant')).toBeInTheDocument()
      // The hex appears twice — once as the chip background (inline style)
      // and once as the trailing text label.
      expect(screen.getByText('#ff00aa')).toBeInTheDocument()
    })
    it('applies the color as the chip background', () => {
      const { container } = render(<Swatch color="#abcdef" label="mean" />)
      const chip = container.querySelector('[style*="background"]')
      expect(chip).toHaveStyle({ background: '#abcdef' })
    })
  })
  describe('with no color', () => {
    it('renders nothing', () => {
      const { container } = render(<Swatch label="empty" />)
      expect(container.firstChild).toBe(null)
    })
  })
})
