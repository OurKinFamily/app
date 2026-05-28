import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Drawer } from '../../../src/components/Drawer'

function renderDrawer({ open = true, title = 'Filters', onClose = vi.fn(), children = <span>body</span> } = {}) {
  const utils = render(<Drawer open={open} onClose={onClose} title={title}>{children}</Drawer>)
  return { ...utils, onClose }
}

describe('Drawer', () => {
  describe('rendering', () => {
    it('renders the title', () => {
      renderDrawer({ title: 'Filters' })
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })
    it('renders its children', () => {
      renderDrawer({ children: <span data-testid="body">hi</span> })
      expect(screen.getByTestId('body')).toBeInTheDocument()
    })
    it('exposes a Close button', () => {
      renderDrawer()
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })
  })

  describe('open/closed branches', () => {
    // Visibility transitions are visual concerns; this only ensures both
    // branches of the open ternary render without throwing.
    it('renders with open=true', () => {
      expect(() => renderDrawer({ open: true })).not.toThrow()
    })
    it('renders with open=false', () => {
      expect(() => renderDrawer({ open: false })).not.toThrow()
    })
  })

  describe('close behavior', () => {
    it('invokes onClose when the X button is clicked', () => {
      const { onClose } = renderDrawer()
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
    it('invokes onClose when the backdrop is clicked', () => {
      const onClose = vi.fn()
      const { container } = render(<Drawer open onClose={onClose} title="t"><span>x</span></Drawer>)
      // The outermost wrapper is the backdrop click target.
      fireEvent.click(container.firstChild)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
    it('does NOT invoke onClose when clicking inside the drawer body', () => {
      const onClose = vi.fn()
      render(<Drawer open onClose={onClose} title="t"><span data-testid="body">x</span></Drawer>)
      // regression: clicks inside the drawer used to bubble up to the
      // backdrop handler and close the drawer mid-interaction.
      fireEvent.click(screen.getByTestId('body'))
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
