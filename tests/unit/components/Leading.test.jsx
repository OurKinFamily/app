import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Leading } from '../../../src/components/Leading'

describe('Leading', () => {
  describe('priority order', () => {
    it('renders an avatar image when avatar is provided (wins over everything else)', () => {
      render(<Leading avatar="/a.jpg" initials text="Cayce" icon={<span>icon</span>} />)
      const img = screen.getByAltText('Cayce')
      expect(img.tagName).toBe('IMG')
      expect(img).toHaveAttribute('src', '/a.jpg')
    })
    it('falls back to initials avatar when no image src is given but initials is truthy', () => {
      render(<Leading initials text="Cayce" icon={<span>icon</span>} />)
      // Avatar w/o src → initials block. First letter of single word.
      expect(screen.getByText('C')).toBeInTheDocument()
    })
    it('renders the icon node when neither avatar nor initials are provided', () => {
      render(<Leading icon={<span data-testid="leading-icon">★</span>} />)
      expect(screen.getByTestId('leading-icon')).toBeInTheDocument()
    })
    it('returns null when nothing is provided', () => {
      const { container } = render(<Leading />)
      expect(container.firstChild).toBe(null)
    })
  })
})
