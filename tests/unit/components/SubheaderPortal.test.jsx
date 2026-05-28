import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubheaderPortal } from '../../../src/components/SubheaderPortal'

describe('SubheaderPortal', () => {
  afterEach(() => {
    const el = document.getElementById('layout-subheader')
    if (el) el.remove()
  })

  describe('when the host slot exists', () => {
    it('renders children into #layout-subheader', () => {
      const slot = document.createElement('div')
      slot.id = 'layout-subheader'
      document.body.appendChild(slot)
      render(<SubheaderPortal><span data-testid="sub">sub</span></SubheaderPortal>)
      expect(slot.contains(screen.getByTestId('sub'))).toBe(true)
    })
  })

  describe('when the host slot is missing', () => {
    it('renders nothing', () => {
      const { container } = render(<SubheaderPortal><span>x</span></SubheaderPortal>)
      expect(container.firstChild).toBe(null)
    })
  })
})
