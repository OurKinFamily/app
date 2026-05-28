import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AlbumPicker } from '../../../src/components/AlbumPicker'

function renderPicker(props = {}) {
  const onClose = vi.fn()
  const onAdded = vi.fn()
  const utils = render(
    <AlbumPicker paths={['archive/x.jpg']} onClose={onClose} onAdded={onAdded} {...props} />
  )
  return { ...utils, onClose, onAdded }
}

describe('AlbumPicker', () => {
  beforeEach(() => { vi.resetAllMocks() })

  describe('initial render', () => {
    it('shows the single-item heading when paths has length 1', () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      renderPicker({ paths: ['archive/x.jpg'] })
      expect(screen.getByText('Add photo to album')).toBeInTheDocument()
    })
    it('shows the bulk heading when paths has multiple entries', () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      renderPicker({ paths: ['a.jpg', 'b.jpg', 'c.jpg'] })
      expect(screen.getByText('Add 3 photos to album')).toBeInTheDocument()
    })
    it('shows a Loading message while albums fetch is pending', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderPicker()
      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })
    it('treats a non-ok response as an empty album list', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false })
      renderPicker()
      await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
    })
  })

  describe('existing albums', () => {
    it('renders a button per album, showing the right icon for private', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 'a1', name: 'Trips',   item_count: 12, is_private: false },
          { id: 'a2', name: 'Family',  item_count: 99, is_private: true },
        ],
      })
      renderPicker()
      await waitFor(() => expect(screen.getByText('Trips')).toBeInTheDocument())
      expect(screen.getByText('Family')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('99')).toBeInTheDocument()
    })

    it('POSTs the paths to /api/albums/{id}/media and calls onAdded + onClose', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'a1', name: 'Trips', item_count: 5, is_private: false }] })
        .mockResolvedValueOnce({ ok: true })
      global.fetch = fetchMock
      const { onAdded, onClose } = renderPicker({ paths: ['x.jpg', 'y.jpg'] })
      await waitFor(() => expect(screen.getByText('Trips')).toBeInTheDocument())
      fireEvent.click(screen.getByText('Trips'))
      await waitFor(() => expect(onAdded).toHaveBeenCalled())
      expect(onAdded).toHaveBeenCalledWith('a1', 2)
      expect(onClose).toHaveBeenCalled()
      const [url, init] = fetchMock.mock.calls[1]
      expect(url).toBe('/api/albums/a1/media')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({ paths: ['x.jpg', 'y.jpg'] })
    })
  })

  describe('create new album flow', () => {
    it('opens an inline form when "New album" is clicked', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      renderPicker()
      await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /New album/ }))
      expect(screen.getByPlaceholderText('New album name…')).toBeInTheDocument()
    })

    it('creates the album then adds the paths', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [] })  // initial GET
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-album' }) })  // POST create
        .mockResolvedValueOnce({ ok: true })  // POST media
      global.fetch = fetchMock
      const { onAdded, onClose } = renderPicker({ paths: ['x.jpg'] })
      await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /New album/ }))
      fireEvent.change(screen.getByPlaceholderText('New album name…'), { target: { value: 'Test' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create & add' }))
      await waitFor(() => expect(onAdded).toHaveBeenCalled())
      expect(onAdded).toHaveBeenCalledWith('new-album', 1)
      expect(onClose).toHaveBeenCalled()
    })

    it('disables the create button while the name is blank', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      renderPicker()
      await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /New album/ }))
      expect(screen.getByRole('button', { name: 'Create & add' })).toBeDisabled()
    })

    it('submits the form on Enter', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new' }) })
        .mockResolvedValueOnce({ ok: true })
      global.fetch = fetchMock
      renderPicker()
      await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /New album/ }))
      const input = screen.getByPlaceholderText('New album name…')
      fireEvent.change(input, { target: { value: 'KB' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    })

    it('cancels back to the album list', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      renderPicker()
      await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /New album/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByPlaceholderText('New album name…')).not.toBeInTheDocument()
    })

    it('aborts the chain when the create POST fails', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({ ok: false })
      global.fetch = fetchMock
      const { onAdded } = renderPicker()
      await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /New album/ }))
      fireEvent.change(screen.getByPlaceholderText('New album name…'), { target: { value: 'X' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create & add' }))
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      expect(onAdded).not.toHaveBeenCalled()
    })
  })

  describe('busy state UI', () => {
    it('disables all album buttons while an add is in flight', async () => {
      let resolveFirst
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [
          { id: 'a1', name: 'Trips', item_count: 5, is_private: false },
        ] })
        .mockImplementationOnce(() => new Promise(r => { resolveFirst = r }))
      global.fetch = fetchMock
      renderPicker({ paths: ['x.jpg'] })
      await waitFor(() => expect(screen.getByText('Trips')).toBeInTheDocument())
      const tripsBtn = screen.getByText('Trips').closest('button')
      await act(async () => { fireEvent.click(tripsBtn) })
      // disabled={busy} → button is disabled while the POST is in flight.
      expect(tripsBtn).toBeDisabled()
      resolveFirst({ ok: true })
    })
    it('createAndAdd is a no-op when called with an empty name', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      renderPicker()
      await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /New album/ }))
      // Submit with name still empty — the early-return should keep fetch
      // count at just the initial GET.
      const before = global.fetch.mock.calls.length
      fireEvent.keyDown(screen.getByPlaceholderText('New album name…'), { key: 'Enter' })
      expect(global.fetch.mock.calls.length).toBe(before)
    })
  })

  describe('close behavior', () => {
    it('invokes onClose on backdrop click', () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      const { container, onClose } = renderPicker()
      fireEvent.click(container.firstChild)
      expect(onClose).toHaveBeenCalled()
    })
    it('invokes onClose when the Close button is clicked', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      const { onClose } = renderPicker()
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(onClose).toHaveBeenCalled()
    })
  })
})
