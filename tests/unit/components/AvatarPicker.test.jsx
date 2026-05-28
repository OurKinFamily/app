import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AvatarPicker } from '../../../src/components/AvatarPicker'
import { mockFetch } from '../helpers'

function renderPicker(props = {}) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const utils = render(
    <AvatarPicker
      person={{ id: 'p1', name: 'Stephen' }}
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />
  )
  return { ...utils, onClose, onSaved }
}

describe('AvatarPicker', () => {
  beforeEach(() => { vi.resetAllMocks() })

  describe('initial render', () => {
    it('shows a Loading message while faces are pending', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderPicker()
      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })
    it('renders the dialog heading', () => {
      mockFetch([])
      renderPicker()
      expect(screen.getByText('Choose a face')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows a "No confirmed faces" message when the API returns an empty list', async () => {
      mockFetch([])
      renderPicker()
      await waitFor(() => expect(screen.getByText('No confirmed faces yet.')).toBeInTheDocument())
    })
  })

  describe('with faces', () => {
    it('renders one button per face', async () => {
      mockFetch([
        { crop_path: 'crop/a.jpg' },
        { crop_path: 'crop/b.jpg' },
        { crop_path: 'crop/c.jpg' },
      ])
      const { container } = renderPicker()
      await waitFor(() => expect(container.querySelectorAll('img').length).toBe(3))
    })

    it('calls setAvatar + onSaved + onClose when a face is picked', async () => {
      // First call → GET faces. Second → PUT avatar. Sequence via vi.fn.
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [{ crop_path: 'crop/a.jpg' }] })
        .mockResolvedValue({ ok: true })
      global.fetch = fetchMock
      const { onSaved, onClose, container } = renderPicker()
      await waitFor(() => expect(container.querySelector('img')).not.toBe(null))
      // The face button is the <button> wrapping the <img>.
      const faceButton = container.querySelector('img').closest('button')
      fireEvent.click(faceButton)
      await waitFor(() => expect(onSaved).toHaveBeenCalled())
      expect(onSaved).toHaveBeenCalledWith('crop/a.jpg')
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('infinite-scroll sentinel', () => {
    it('attaches an IntersectionObserver to the load-more sentinel when there are more faces than the page size', async () => {
      // Install firing observer BEFORE rendering so the effect picks it up.
      const created = []
      const RealIO = globalThis.IntersectionObserver
      globalThis.IntersectionObserver = class {
        constructor(cb) { this.cb = cb; created.push(this) }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      // Render with > PAGE_SIZE (60) faces so the sentinel ref is mounted.
      const faces = Array.from({ length: 80 }, (_, i) => ({ crop_path: `crop/${i}.jpg` }))
      mockFetch(faces)
      const { container } = renderPicker()
      await waitFor(() => expect(container.querySelectorAll('img').length).toBe(60))
      expect(created.length).toBeGreaterThan(0)
      // Firing the callback as intersecting should reveal more.
      created.at(-1).cb([{ isIntersecting: true }])
      await waitFor(() => expect(container.querySelectorAll('img').length).toBe(80))
      globalThis.IntersectionObserver = RealIO
    })
  })

  describe('close behavior', () => {
    it('invokes onClose on backdrop click', () => {
      mockFetch([])
      const { container, onClose } = renderPicker()
      fireEvent.click(container.firstChild)
      expect(onClose).toHaveBeenCalled()
    })
    it('does NOT invoke onClose when clicking inside the dialog', () => {
      mockFetch([])
      const { onClose } = renderPicker()
      fireEvent.click(screen.getByText('Choose a face'))
      expect(onClose).not.toHaveBeenCalled()
    })
    it('invokes onClose when the × button is clicked', () => {
      mockFetch([])
      const { onClose } = renderPicker()
      // The × button uses the literal character; query by text.
      fireEvent.click(screen.getByText('×'))
      expect(onClose).toHaveBeenCalled()
    })
    it('invokes onClose on Escape key', () => {
      mockFetch([])
      const { onClose } = renderPicker()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })
  })
})
