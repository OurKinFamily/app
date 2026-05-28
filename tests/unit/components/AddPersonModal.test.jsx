import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddPersonModal } from '../../../src/components/AddPersonModal'

function renderModal(props = {}) {
  const onClose   = vi.fn()
  const onCreated = vi.fn()
  const utils = render(<AddPersonModal onClose={onClose} onCreated={onCreated} {...props} />)
  return { ...utils, onClose, onCreated }
}

describe('AddPersonModal', () => {
  beforeEach(() => { vi.resetAllMocks() })

  describe('initial render', () => {
    it('shows the heading and a required Full name field', () => {
      renderModal()
      expect(screen.getByText('Add Person')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('e.g. Margaret Young')).toBeInTheDocument()
    })
    it('disables the submit button while name is empty', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Add person' })).toBeDisabled()
    })
  })

  describe('submission', () => {
    it('POSTs the form fields and calls onCreated with the new person', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'new', name: 'Margaret' }),
      })
      global.fetch = fetchMock
      const { onCreated } = renderModal()
      fireEvent.change(screen.getByPlaceholderText('e.g. Margaret Young'), { target: { value: 'Margaret Young' } })
      fireEvent.change(screen.getByPlaceholderText('e.g. Grandma Young'), { target: { value: 'Grandma' } })
      fireEvent.change(screen.getByPlaceholderText('e.g. 1942'),          { target: { value: '1942' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add person' }))
      await waitFor(() => expect(onCreated).toHaveBeenCalled())
      const [, init] = fetchMock.mock.calls[0]
      expect(JSON.parse(init.body)).toEqual({
        name: 'Margaret Young',
        known_as: 'Grandma',
        birth_date: '1942',
        birth_date_precision: 'year',
      })
    })
    it('sends null for empty optional fields and omits birth precision', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'x' }) })
      global.fetch = fetchMock
      const { onCreated } = renderModal()
      fireEvent.change(screen.getByPlaceholderText('e.g. Margaret Young'), { target: { value: 'X' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add person' }))
      await waitFor(() => expect(onCreated).toHaveBeenCalled())
      const [, init] = fetchMock.mock.calls[0]
      expect(JSON.parse(init.body)).toEqual({
        name: 'X',
        known_as: null,
        birth_date: null,
        birth_date_precision: null,
      })
    })
    it('shows an error message and stays open when create fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false })
      const { onCreated } = renderModal()
      fireEvent.change(screen.getByPlaceholderText('e.g. Margaret Young'), { target: { value: 'X' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add person' }))
      await waitFor(() => expect(screen.getByText('Failed to create person')).toBeInTheDocument())
      expect(onCreated).not.toHaveBeenCalled()
    })
    it('does not submit when the name is only whitespace', () => {
      const fetchMock = vi.fn()
      global.fetch = fetchMock
      const { container } = renderModal()
      fireEvent.change(screen.getByPlaceholderText('e.g. Margaret Young'), { target: { value: '   ' } })
      // Submit button is disabled when name is empty; submit the form
      // directly to exercise the handler's early-return guard.
      fireEvent.submit(container.querySelector('form'))
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('close behavior', () => {
    it('invokes onClose on backdrop click', () => {
      const { container, onClose } = renderModal()
      fireEvent.click(container.firstChild)
      expect(onClose).toHaveBeenCalled()
    })
    it('does NOT invoke onClose when clicking inside the modal body', () => {
      const { onClose } = renderModal()
      fireEvent.click(screen.getByText('Add Person'))
      expect(onClose).not.toHaveBeenCalled()
    })
    it('invokes onClose when the ✕ button is clicked', () => {
      const { onClose } = renderModal()
      fireEvent.click(screen.getByText('✕'))
      expect(onClose).toHaveBeenCalled()
    })
    it('invokes onClose on Cancel', () => {
      const { onClose } = renderModal()
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalled()
    })
    it('invokes onClose on Escape', () => {
      const { onClose } = renderModal()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })
  })
})
