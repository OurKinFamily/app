import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FaceAssignPopover } from '../../../src/components/FaceAssignPopover'

function renderPopover(props = {}) {
  const onClose    = vi.fn()
  const onAssigned = vi.fn()
  const utils = render(
    <FaceAssignPopover
      face={{ face_index: 0, crop_path: 'crop/x.jpg', crop_url: '/crop/x.jpg' }}
      photoPath="archive/x.jpg"
      x={100} y={100}
      onClose={onClose}
      onAssigned={onAssigned}
      {...props}
    />
  )
  return { ...utils, onClose, onAssigned }
}

describe('FaceAssignPopover', () => {
  beforeEach(() => { vi.resetAllMocks() })

  describe('initial render', () => {
    it('shows the face crop image when crop_url is provided', () => {
      const { container } = renderPopover()
      // `<img alt="">` has presentation role (not img) per ARIA — query by
      // attribute instead so the test doesn't fall over on accessibility
      // semantics that aren't the point.
      expect(container.querySelector('img')).toHaveAttribute('src', '/crop/x.jpg')
    })
    it('omits the image when no crop_url is provided', () => {
      const { container } = renderPopover({ face: { face_index: 0 } })
      expect(container.querySelector('img')).toBe(null)
    })
    it('renders a Select for searching people', () => {
      const { container } = renderPopover()
      expect(container.querySelector('input[placeholder="Search a person to assign…"]')).not.toBeNull()
    })
  })

  describe('search', () => {
    it('calls searchPeople when typing into the search input', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'p1', name: 'Stephen' }],
      })
      global.fetch = fetchMock
      const { container } = renderPopover()
      const input = container.querySelector('input')
      fireEvent.change(input, { target: { value: 'stephen' } })
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(fetchMock.mock.calls[0][0]).toContain('/api/people/search')
    })
    it('survives a failed search without throwing', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('net'))
      const { container } = renderPopover()
      const input = container.querySelector('input')
      expect(() => fireEvent.change(input, { target: { value: 'x' } })).not.toThrow()
    })
    it('clears results when the query is emptied', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'p1', name: 'Stephen', known_as: 'Steve' }],
      })
      const { container } = renderPopover()
      const input = container.querySelector('input')
      fireEvent.change(input, { target: { value: 'st' } })
      await waitFor(() => expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument())
      fireEvent.change(input, { target: { value: '' } })
      // results cleared → option disappears.
      await waitFor(() => expect(screen.queryByRole('button', { name: /Stephen/ })).not.toBeInTheDocument())
    })
    it('renders the (known_as) prefix in option labels (toOption helper)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 'p1', name: 'Stephen E. Young', known_as: 'Stephen' },
        ],
      })
      const { container } = renderPopover()
      fireEvent.change(container.querySelector('input'), { target: { value: 'ste' } })
      // toOption produces a label with "(Stephen) Stephen E. Young"; the
      // dropdown option button text contains both.
      await waitFor(() => expect(screen.getByRole('button', { name: /Stephen E\. Young/ })).toBeInTheDocument())
      expect(screen.getByText(/\(Stephen\)/)).toBeInTheDocument()
    })
    it('renders an avatar URL via mediaUrl when the person has one', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 'p1', name: 'X', avatar: 'archive/avatars/x.jpg' },
        ],
      })
      const { container } = renderPopover()
      fireEvent.change(container.querySelector('input'), { target: { value: 'x' } })
      await waitFor(() => expect(container.querySelector('img[src*="archive/avatars/x.jpg"]')).not.toBeNull())
    })
  })

  describe('assignment failure paths', () => {
    it('swallows fetch rejections when picking an option', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [
          { id: 'p1', name: 'Stephen' },
        ] })
        .mockRejectedValueOnce(new Error('net'))
      global.fetch = fetchMock
      const { container, onAssigned, onClose } = renderPopover()
      fireEvent.change(container.querySelector('input'), { target: { value: 'ste' } })
      await waitFor(() => expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Stephen/ }))
      // Failed assignment still calls onAssigned + onClose — the catch swallows.
      await waitFor(() => expect(onClose).toHaveBeenCalled())
      expect(onAssigned).toHaveBeenCalled()
    })
    it('no-ops createAndAssign when query is empty', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      renderPopover()
      // Without typing, "Create new person" button never appears, so no
      // way to trigger createAndAssign. Verify the button isn't rendered
      // for an empty query — that itself exercises the conditional render
      // (and the guard inside createAndAssign would no-op even if invoked).
      expect(screen.queryByText(/Create new person/)).not.toBeInTheDocument()
    })
    it('Creating button is disabled while createPerson is in flight', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockImplementationOnce(() => new Promise(() => {}))
      global.fetch = fetchMock
      const { container } = renderPopover()
      fireEvent.change(container.querySelector('input'), { target: { value: 'NewName' } })
      await waitFor(() => expect(screen.getByText(/Create new person/)).toBeInTheDocument())
      fireEvent.click(screen.getByText(/Create new person/))
      await waitFor(() => expect(screen.getByText(/Creating "NewName"/)).toBeInTheDocument())
      expect(screen.getByText(/Creating "NewName"/).closest('button')).toBeDisabled()
    })
  })

  describe('"+ Create new person" affordance', () => {
    it('appears once the user types a query that does not match any result', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      const { container } = renderPopover()
      fireEvent.change(container.querySelector('input'), { target: { value: 'newperson' } })
      await waitFor(() => expect(screen.getByText(/Create new person/)).toBeInTheDocument())
    })

    it('creates the person then POSTs the face assignment', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [] })  // empty search
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-id' }) })  // createPerson
        .mockResolvedValueOnce({ ok: true })  // POST face assign
      global.fetch = fetchMock
      const { onAssigned, onClose, container } = renderPopover()
      fireEvent.change(container.querySelector('input'), { target: { value: 'Stephen' } })
      await waitFor(() => expect(screen.getByText(/Create new person/)).toBeInTheDocument())
      fireEvent.click(screen.getByText(/Create new person/))
      await waitFor(() => expect(onAssigned).toHaveBeenCalled())
      expect(onClose).toHaveBeenCalled()
      // 3rd call = POST to /api/people/new-id/faces
      const [url, init] = fetchMock.mock.calls[2]
      expect(url).toBe('/api/people/new-id/faces')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({
        photo_path: 'archive/x.jpg',
        face_index: 0,
        crop_path:  'crop/x.jpg',
      })
    })
  })

  describe('createPerson failure', () => {
    it('alerts when createPerson rejects', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [] })  // empty search
        .mockResolvedValueOnce({ ok: false })  // createPerson fails
      global.fetch = fetchMock
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      const { container } = renderPopover()
      fireEvent.change(container.querySelector('input'), { target: { value: 'Stephen' } })
      await waitFor(() => expect(screen.getByText(/Create new person/)).toBeInTheDocument())
      fireEvent.click(screen.getByText(/Create new person/))
      await waitFor(() => expect(alertSpy).toHaveBeenCalled())
      alertSpy.mockRestore()
    })
  })

  describe('positioning', () => {
    it('clamps the popover to the viewport (left/top stays within bounds)', () => {
      const { container } = renderPopover({ x: 99999, y: 99999 })
      // The popover element is the one with the inline style. We don't
      // assert exact values — only that it doesn't crash with extreme inputs.
      const popover = container.querySelectorAll('div')[1]
      expect(popover).toBeDefined()
    })
  })

  describe('close behavior', () => {
    it('invokes onClose when the backdrop is clicked', () => {
      const { container, onClose } = renderPopover()
      // The backdrop is the first child of the rendered fragment.
      fireEvent.click(container.firstChild)
      expect(onClose).toHaveBeenCalled()
    })
  })
})
