import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeaderTrailingPortal } from '../../../src/components/HeaderTrailingPortal'

describe('HeaderTrailingPortal', () => {
  afterEach(() => {
    const el = document.getElementById('layout-header-trailing')
    if (el) el.remove()
  })

  describe('when the host slot exists', () => {
    it('renders children into #layout-header-trailing', () => {
      const slot = document.createElement('div')
      slot.id = 'layout-header-trailing'
      document.body.appendChild(slot)
      render(<HeaderTrailingPortal><span data-testid="x">x</span></HeaderTrailingPortal>)
      expect(slot.contains(screen.getByTestId('x'))).toBe(true)
    })
  })

  describe('when the host slot is missing', () => {
    it('renders nothing', () => {
      const { container } = render(<HeaderTrailingPortal><span>x</span></HeaderTrailingPortal>)
      expect(container.firstChild).toBe(null)
    })
  })
})
