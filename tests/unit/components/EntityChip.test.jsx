import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { EntityChip } from '../../../src/components/EntityChip'
import { renderWithRouter } from '../helpers'

describe('EntityChip', () => {
  describe('rendering as a Link', () => {
    it('renders an <a> when `to` is provided', () => {
      renderWithRouter(<EntityChip text="Cayce" to="/people/c1" />)
      const link = screen.getByRole('link', { name: /Cayce/ })
      expect(link).toHaveAttribute('href', '/people/c1')
    })
  })

  describe('rendering as a button', () => {
    it('renders a <button> when onClick is provided', () => {
      const onClick = vi.fn()
      renderWithRouter(<EntityChip text="Cayce" onClick={onClick} />)
      const btn = screen.getByRole('button', { name: /Cayce/ })
      btn.click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('rendering as a plain div', () => {
    it('renders a non-interactive element when neither `to` nor onClick is given', () => {
      renderWithRouter(<EntityChip text="Cayce" />)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cayce' })).not.toBeInTheDocument()
      expect(screen.getByText('Cayce')).toBeInTheDocument()
    })
  })

  describe('caption', () => {
    it('renders the caption below the main text when provided', () => {
      renderWithRouter(<EntityChip text="Patty" caption="MOTHER" />)
      expect(screen.getByText('Patty')).toBeInTheDocument()
      expect(screen.getByText('MOTHER')).toBeInTheDocument()
    })
  })

  describe('remove button', () => {
    it('renders an X button when onRemove is provided', () => {
      const onRemove = vi.fn()
      renderWithRouter(<EntityChip text="Cayce" onRemove={onRemove} removeLabel="Remove Cayce" />)
      expect(screen.getByRole('button', { name: 'Remove Cayce' })).toBeInTheDocument()
    })
    it('invokes onRemove and stops propagation when clicked', () => {
      const onRemove = vi.fn()
      const onClick  = vi.fn()
      renderWithRouter(<EntityChip text="Cayce" onClick={onClick} onRemove={onRemove} removeLabel="Remove" />)
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
      expect(onRemove).toHaveBeenCalledTimes(1)
      // Click on X must not bubble to the chip's own onClick.
      expect(onClick).not.toHaveBeenCalled()
    })
    it('omits the X when onRemove is not provided', () => {
      renderWithRouter(<EntityChip text="Cayce" />)
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    })
  })

  describe('leading visual', () => {
    it('renders an avatar image when avatar is provided', () => {
      renderWithRouter(<EntityChip text="Cayce" avatar="/c.jpg" />)
      expect(screen.getByAltText('Cayce').tagName).toBe('IMG')
    })
  })
})
