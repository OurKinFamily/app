import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EntityItem } from '../../../src/components/EntityItem'

describe('EntityItem', () => {
  describe('text + badge', () => {
    it('renders the primary text', () => {
      render(<EntityItem text="Cayce" />)
      expect(screen.getByText('Cayce')).toBeInTheDocument()
    })
    it('renders the optional badge alongside the text', () => {
      render(<EntityItem text="Cayce" badge="SPOUSE" />)
      expect(screen.getByText('SPOUSE')).toBeInTheDocument()
    })
    it('renders secondary text when provided', () => {
      render(<EntityItem text="Cayce" secondary="Class of 2008" />)
      expect(screen.getByText('Class of 2008')).toBeInTheDocument()
    })
    it('renders the trailing slot when provided', () => {
      render(<EntityItem text="Cayce" trailing={<span data-testid="trail">→</span>} />)
      expect(screen.getByTestId('trail')).toBeInTheDocument()
    })
  })

  describe('interactive element choice', () => {
    it('renders a <button> when onClick is provided', () => {
      const onClick = vi.fn()
      render(<EntityItem text="Cayce" onClick={onClick} />)
      expect(screen.getByRole('button', { name: /Cayce/ })).toBeInTheDocument()
    })
    it('invokes onClick on click', () => {
      const onClick = vi.fn()
      render(<EntityItem text="Cayce" onClick={onClick} />)
      screen.getByRole('button').click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
    it('renders a non-button element when no onClick is given', () => {
      render(<EntityItem text="Cayce" />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('leading visual', () => {
    it('renders an avatar image when avatar is provided', () => {
      render(<EntityItem text="Cayce" avatar="/c.jpg" />)
      expect(screen.getByAltText('Cayce').tagName).toBe('IMG')
    })
    it('omits the leading slot when no avatar/icon/initials are provided', () => {
      const { container } = render(<EntityItem text="Cayce" />)
      expect(container.querySelector('img')).toBe(null)
    })
  })
})
