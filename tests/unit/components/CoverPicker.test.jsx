import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CoverPicker } from '../../../src/components/CoverPicker'

function renderPicker(person, props = {}) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const utils = render(<CoverPicker person={person} onClose={onClose} onSaved={onSaved} {...props} />)
  return { ...utils, onClose, onSaved }
}

describe('CoverPicker', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
    vi.clearAllMocks()
  })

  describe('initial render', () => {
    it('starts with the person\'s saved cover_position selected', () => {
      renderPicker({ id: 'p1', cover_position: 'top', cover_image: 'archive/x.jpg' })
      // The active state is styling, which the no-class-name rule puts out of
      // reach; the behaviour that matters is what Save sends, covered below.
      expect(screen.getByRole('button', { name: 'Top' })).toBeInTheDocument()
    })
    it('defaults to fit when person.cover_position is missing', async () => {
      const { onSaved } = renderPicker({ id: 'p1' })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(onSaved).toHaveBeenCalled())
      expect(onSaved).toHaveBeenCalledWith({ cover_image: null, cover_position: 'fit' })
    })
    it('offers the whole-photo option', () => {
      renderPicker({ id: 'p1' })
      expect(screen.getByRole('button', { name: /Whole photo/ })).toBeInTheDocument()
    })
  })

  describe('changing the alignment', () => {
    it('saves the newly-picked position', async () => {
      const { onSaved } = renderPicker({ id: 'p1', cover_image: 'archive/x.jpg', cover_position: 'center' })
      fireEvent.click(screen.getByRole('button', { name: 'Bottom' }))
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(onSaved).toHaveBeenCalled())
      expect(onSaved).toHaveBeenCalledWith({ cover_image: 'archive/x.jpg', cover_position: 'bottom' })
    })
    it('saves fit when the whole-photo option is picked', async () => {
      const { onSaved } = renderPicker({ id: 'p1', cover_image: 'archive/x.jpg', cover_position: 'top' })
      fireEvent.click(screen.getByRole('button', { name: /Whole photo/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(onSaved).toHaveBeenCalled())
      expect(onSaved).toHaveBeenCalledWith({ cover_image: 'archive/x.jpg', cover_position: 'fit' })
    })
  })

  describe('clear-cover action', () => {
    it('offers to clear the cover only when there is one', () => {
      const { rerender } = render(
        <CoverPicker person={{ id: 'p1', cover_image: 'archive/x.jpg' }} onClose={() => {}} onSaved={() => {}} />
      )
      expect(screen.getByRole('button', { name: 'Use any photo' })).toBeInTheDocument()
      rerender(<CoverPicker person={{ id: 'p1' }} onClose={() => {}} onSaved={() => {}} />)
      expect(screen.queryByRole('button', { name: 'Use any photo' })).not.toBeInTheDocument()
    })
    it('clearing wipes both cover_image and cover_position via onSaved', async () => {
      const { onSaved } = renderPicker({ id: 'p1', cover_image: 'archive/x.jpg', cover_position: 'top' })
      fireEvent.click(screen.getByRole('button', { name: 'Use any photo' }))
      await waitFor(() => expect(onSaved).toHaveBeenCalled())
      expect(onSaved).toHaveBeenCalledWith({ cover_image: null, cover_position: null })
    })
  })

  describe('saving state UI', () => {
    it('shows "Saving…" and disables Save while the request is in flight', async () => {
      let resolveFirst
      global.fetch = vi.fn().mockImplementation(() => new Promise(r => { resolveFirst = r }))
      render(<CoverPicker person={{ id: 'p1', cover_image: 'x.jpg', cover_position: 'top' }} onClose={() => {}} onSaved={vi.fn()} />)
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save' })) })
      expect(screen.getByText('Saving…')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
      resolveFirst({ ok: true })
    })
  })

  describe('close behavior', () => {
    it('invokes onClose on backdrop click', () => {
      const { container, onClose } = renderPicker({ id: 'p1' })
      fireEvent.mouseDown(container.firstChild)
      expect(onClose).toHaveBeenCalled()
    })
    it('invokes onClose when the Close button is clicked', () => {
      const { onClose } = renderPicker({ id: 'p1' })
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(onClose).toHaveBeenCalled()
    })
  })
})
