import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
vi.mock('../../../src/contexts/MeContext', () => ({ useIsAdmin: vi.fn(() => true) }))
import { MediaDetail } from '../../../src/components/MediaDetail'
import { useIsAdmin } from '../../../src/contexts/MeContext'
import { renderWithRouter } from '../helpers'

beforeEach(() => { useIsAdmin.mockReturnValue(true) })

const ITEM = { path: 'archive/x.jpg', filename: 'x.jpg' }

function makeCtx(overrides = {}) {
  return {
    setHighlight: vi.fn(),
    setFaces:     vi.fn(),
    openAssign:   vi.fn(),
    setSheetOpen: vi.fn(),
    bumpDetail:   vi.fn(),
    setAudio:     vi.fn(),
    ...overrides,
  }
}

function mockDetail(detail) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => detail })
}

describe('MediaDetail', () => {
  beforeEach(() => { vi.resetAllMocks() })

  describe('header', () => {
    it('renders the item filename', () => {
      mockDetail(null)
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      expect(screen.getByText('x.jpg')).toBeInTheDocument()
    })
    it('falls back to the path when no filename is set', () => {
      mockDetail(null)
      renderWithRouter(<MediaDetail item={{ path: 'archive/y.jpg' }} ctx={makeCtx()} />)
      expect(screen.getByText('archive/y.jpg')).toBeInTheDocument()
    })
    it('shows Loading text until the detail resolves', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })
  })

  describe('Subject section (heritage)', () => {
    it('renders subject + type when present', async () => {
      mockDetail({ heritage: { context_subject: 'Wedding', context_type: 'home_movies' }, people: [], unidentified: [], objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByText('Wedding')).toBeInTheDocument())
      expect(screen.getByText('home movies')).toBeInTheDocument()
    })
    it('omits the section entirely when neither subject nor type is set', async () => {
      mockDetail({ people: [], unidentified: [], objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.queryByText('Subject')).not.toBeInTheDocument())
    })
  })

  describe('Connection callout (heritage.context_notes)', () => {
    it('renders the Connection note when present', async () => {
      mockDetail({ heritage: { context_notes: 'This is his regiment.' }, people: [], unidentified: [], objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      // context_notes shows in the Connection callout here AND in the Notes
      // section inside MediaDetailMeta — so it appears more than once.
      await waitFor(() => expect(screen.getAllByText('This is his regiment.').length).toBeGreaterThan(0))
      expect(screen.getByText('Connection')).toBeInTheDocument()
    })
    it('omits the callout when there is no context_notes', async () => {
      mockDetail({ heritage: { context_subject: 'X' }, people: [], unidentified: [], objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument())
      expect(screen.queryByText('Connection')).not.toBeInTheDocument()
    })
  })

  describe('People section', () => {
    it('shows "+ Add person" for an admin', async () => {
      mockDetail({ people: [{ id: 'p1', name: 'Stephen', face_index: 0 }], unidentified: [], objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByText('+ Add person')).toBeInTheDocument())
    })
    it('hides "+ Add person" (and unassign) for a non-admin', async () => {
      useIsAdmin.mockReturnValue(false)
      mockDetail({ people: [{ id: 'p1', name: 'Stephen', face_index: 0 }], unidentified: [], objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByRole('link', { name: /Stephen/ })).toBeInTheDocument())
      expect(screen.queryByText('+ Add person')).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Unassign/)).not.toBeInTheDocument()
    })
    it('renders an EntityChip per identified person, linking to their page', async () => {
      mockDetail({
        people: [
          { id: 'p1', name: 'Stephen', face_index: 0 },
          { id: 'p2', name: 'Cayce',   face_index: 1 },
        ],
        unidentified: [], objects: [],
      })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByRole('link', { name: /Stephen/ })).toBeInTheDocument())
      expect(screen.getByRole('link', { name: /Cayce/ })).toHaveAttribute('href', '/manage/people/p2')
    })
    it('publishes faces (with normalised bboxes) to the lightbox context', async () => {
      const ctx = makeCtx()
      mockDetail({
        media: { width: 1000, height: 1000 },
        people: [{ id: 'p1', name: 'Stephen', bbox: [100, 100, 500, 500] }],
        unidentified: [{ face_index: 0, bbox: [200, 200, 400, 400] }],
        objects: [],
      })
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      // setFaces is called once with [] before detail loads, then again with
      // the populated list. Wait for the populated call before asserting.
      await waitFor(() => {
        const last = ctx.setFaces.mock.calls.at(-1)?.[0]
        expect(Array.isArray(last) && last.length > 0).toBe(true)
      })
      const faces = ctx.setFaces.mock.calls.at(-1)[0]
      expect(faces[0].bbox).toEqual([0.1, 0.1, 0.5, 0.5])
      expect(faces[0].identified).toBe(true)
      expect(faces[1].identified).toBe(false)
    })
    it('filters out people without bbox + handles missing unidentified array', async () => {
      const ctx = makeCtx()
      mockDetail({
        people: [
          { id: 'p1', name: 'WithBbox', bbox: [10, 10, 20, 20] },
          { id: 'p2', name: 'NoBbox' },  // filtered out
        ],
        // unidentified omitted entirely → falls back to []
        objects: [],
      })
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => {
        const last = ctx.setFaces.mock.calls.at(-1)?.[0]
        expect(Array.isArray(last) && last.length > 0).toBe(true)
      })
      const faces = ctx.setFaces.mock.calls.at(-1)[0]
      expect(faces.length).toBe(1)
      expect(faces[0].identified).toBe(true)
    })
    it('uses known_as label when available, falls back to name otherwise', async () => {
      const ctx = makeCtx()
      mockDetail({
        people: [
          { id: 'p1', name: 'Stephen E. Young', known_as: 'Stephen', bbox: [1, 2, 3, 4] },
          { id: 'p2', name: 'Cayce', bbox: [5, 6, 7, 8] },
        ],
        unidentified: [], objects: [],
      })
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => {
        const last = ctx.setFaces.mock.calls.at(-1)?.[0]
        expect(Array.isArray(last) && last.length > 0).toBe(true)
      })
      const faces = ctx.setFaces.mock.calls.at(-1)[0]
      expect(faces[0].label).toBe('Stephen')
      expect(faces[1].label).toBe('Cayce')
    })
    it('renders age caption on person chips when sidecar timestamp + birth_date align', async () => {
      mockDetail({
        people: [{ id: 'p1', name: 'Stephen', birth_date: '1986-04-14' }],
        unidentified: [], objects: [],
        sidecar: { timestamps: { primary: { timestamp: '2024-04-14T00:00:00Z', confidence: 'high' } } },
      })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByText('age 38')).toBeInTheDocument())
    })
    it('omits age caption when sidecar has no high-confidence timestamp', async () => {
      mockDetail({
        people: [{ id: 'p1', name: 'Stephen', birth_date: '1986-04-14' }],
        unidentified: [], objects: [],
      })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByRole('link', { name: /Stephen/ })).toBeInTheDocument())
      expect(screen.queryByText(/^age /)).not.toBeInTheDocument()
    })
    it('renders an avatar via mediaUrl fallback when crop_url is missing', async () => {
      mockDetail({
        people: [{ id: 'p1', name: 'X', avatar: 'archive/avatars/x.jpg' }],
        unidentified: [], objects: [],
      })
      const { container } = renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(container.querySelector('img[src*="archive/avatars/x.jpg"]')).not.toBeNull())
    })
    it('passes raw bbox when media dimensions are not known', async () => {
      const ctx = makeCtx()
      mockDetail({
        people: [{ id: 'p1', name: 'X', bbox: [1, 2, 3, 4] }],
        unidentified: [], objects: [],
      })
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => {
        const last = ctx.setFaces.mock.calls.at(-1)?.[0]
        expect(Array.isArray(last) && last.length > 0).toBe(true)
      })
      const faces = ctx.setFaces.mock.calls.at(-1)[0]
      expect(faces[0].bbox).toEqual([1, 2, 3, 4])
    })
  })

  describe('Add Person flow', () => {
    it('reveals an inline search when "+ Add person" is clicked', async () => {
      mockDetail({ people: [], unidentified: [], objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByRole('button', { name: /Add person/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Add person/ }))
      expect(screen.getByPlaceholderText('Add a person…')).toBeInTheDocument()
    })
    it('shows the "+ Create new person" affordance once the user types', async () => {
      mockDetail({ people: [], unidentified: [], objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByRole('button', { name: /Add person/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Add person/ }))
      fireEvent.change(screen.getByPlaceholderText('Add a person…'), { target: { value: 'NewName' } })
      await waitFor(() => expect(screen.getByText(/Create new person/)).toBeInTheDocument())
    })
    it('search results WITH avatar use the mediaUrl branch in personToOption', async () => {
      const ctx = makeCtx()
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ people: [], unidentified: [], objects: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'p1', name: 'WithAvatar', avatar: 'archive/x.jpg' }] })
      global.fetch = fetchMock
      const { container } = renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('button', { name: /Add person/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Add person/ }))
      fireEvent.change(screen.getByPlaceholderText('Add a person…'), { target: { value: 'with' } })
      await waitFor(() => expect(container.querySelector('img[src*="archive/x.jpg"]')).not.toBeNull())
    })
    it('search results without avatar use the null branch in personToOption', async () => {
      const ctx = makeCtx()
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ people: [], unidentified: [], objects: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'p1', name: 'NoAvatar' }] })
      global.fetch = fetchMock
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('button', { name: /Add person/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Add person/ }))
      fireEvent.change(screen.getByPlaceholderText('Add a person…'), { target: { value: 'no' } })
      await waitFor(() => expect(screen.getByRole('button', { name: /NoAvatar/ })).toBeInTheDocument())
    })
    it('swallows tagPerson fetch rejections', async () => {
      const ctx = makeCtx()
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ people: [], unidentified: [], objects: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'p1', name: 'Pick' }] })
        .mockRejectedValueOnce(new Error('net'))  // tagPerson fetch fails
      global.fetch = fetchMock
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('button', { name: /Add person/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Add person/ }))
      fireEvent.change(screen.getByPlaceholderText('Add a person…'), { target: { value: 'pi' } })
      await waitFor(() => expect(screen.getByRole('button', { name: /Pick/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Pick/ }))
      // Catch swallows → bumpDetail still called via tagPerson finally path.
      await waitFor(() => expect(ctx.bumpDetail).toHaveBeenCalled())
    })
    it('search results render via personToOption inside the Select', async () => {
      const ctx = makeCtx()
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ people: [], unidentified: [], objects: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [
          { id: 'p1', name: 'Stephen Young', known_as: 'Stephen', avatar: null },
        ] })
      global.fetch = fetchMock
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('button', { name: /Add person/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Add person/ }))
      fireEvent.change(screen.getByPlaceholderText('Add a person…'), { target: { value: 'ste' } })
      // personToOption produces `text = known_as || name = 'Stephen'`; option
      // dropdown shows the option button.
      await waitFor(() => expect(screen.getByRole('button', { name: /Stephen Young/ })).toBeInTheDocument())
    })
    it('Creating button is disabled while createPerson is in flight', async () => {
      const ctx = makeCtx()
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ people: [], unidentified: [], objects: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockImplementationOnce(() => new Promise(() => {}))
      global.fetch = fetchMock
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('button', { name: /Add person/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Add person/ }))
      fireEvent.change(screen.getByPlaceholderText('Add a person…'), { target: { value: 'NewName' } })
      await waitFor(() => expect(screen.getByText(/Create new person/)).toBeInTheDocument())
      const btn = screen.getByText(/Create new person/)
      fireEvent.click(btn)
      await waitFor(() => expect(screen.getByText(/Creating "NewName"/)).toBeInTheDocument())
      expect(screen.getByText(/Creating "NewName"/).closest('button')).toBeDisabled()
    })
    it('alerts when createPerson fails inside createAndTag', async () => {
      const ctx = makeCtx()
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ people: [], unidentified: [], objects: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [] })  // empty search
        .mockResolvedValueOnce({ ok: false })  // createPerson fails
      global.fetch = fetchMock
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('button', { name: /Add person/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Add person/ }))
      fireEvent.change(screen.getByPlaceholderText('Add a person…'), { target: { value: 'NewName' } })
      await waitFor(() => expect(screen.getByText(/Create new person/)).toBeInTheDocument())
      fireEvent.click(screen.getByText(/Create new person/))
      await waitFor(() => expect(alertSpy).toHaveBeenCalled())
      alertSpy.mockRestore()
    })

    it('createAndTag: POSTs createPerson then tag, then closes the add flow', async () => {
      const ctx = makeCtx()
      const fetchMock = vi.fn()
        // initial detail fetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ people: [], unidentified: [], objects: [] }) })
        // search (empty)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        // createPerson POST
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'np' }) })
        // tag POST
        .mockResolvedValueOnce({ ok: true })
      global.fetch = fetchMock
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('button', { name: /Add person/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Add person/ }))
      fireEvent.change(screen.getByPlaceholderText('Add a person…'), { target: { value: 'NewName' } })
      await waitFor(() => expect(screen.getByText(/Create new person/)).toBeInTheDocument())
      fireEvent.click(screen.getByText(/Create new person/))
      await waitFor(() => expect(ctx.bumpDetail).toHaveBeenCalled())
    })
  })

  describe('hover sets highlight via normBbox', () => {
    it('hovers a person chip and pushes the normalised bbox into ctx.setHighlight', async () => {
      const ctx = makeCtx()
      mockDetail({
        media: { width: 1000, height: 1000 },
        people: [{ id: 'p1', name: 'Stephen', face_index: 2, bbox: [100, 100, 500, 500] }],
        unidentified: [], objects: [],
      })
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('link', { name: /Stephen/ })).toBeInTheDocument())
      // Hover the chip wrapper.
      const wrapper = screen.getByRole('link', { name: /Stephen/ }).closest('span')
      fireEvent.mouseEnter(wrapper)
      expect(ctx.setHighlight).toHaveBeenCalled()
      fireEvent.mouseLeave(wrapper)
      expect(ctx.setHighlight).toHaveBeenLastCalledWith(null)
    })
    it('clears Add-person results when the query is emptied', async () => {
      mockDetail({ people: [], unidentified: [], objects: [] })
      // Sequence: detail GET, then search, then empty search.
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ people: [], unidentified: [], objects: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'p1', name: 'X' }] })
      global.fetch = fetchMock
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByRole('button', { name: /Add person/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Add person/ }))
      const input = screen.getByPlaceholderText('Add a person…')
      fireEvent.change(input, { target: { value: 'x' } })
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      // Empty out → setAddResults([]) early return.
      fireEvent.change(input, { target: { value: '' } })
      // No third fetch should have fired.
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('Unassign person (onRemove)', () => {
    it('confirms with the user, calls unassignFace, and bumps detail', async () => {
      const ctx = makeCtx()
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            people: [{ id: 'p1', name: 'Stephen', face_index: 2 }],
            unidentified: [], objects: [],
          }),
        })
        // unassignFace DELETE
        .mockResolvedValue({ ok: true })
      global.fetch = fetchMock
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('link', { name: /Stephen/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'Unassign Stephen' }))
      await waitFor(() => expect(ctx.bumpDetail).toHaveBeenCalled())
      expect(confirmSpy).toHaveBeenCalled()
      confirmSpy.mockRestore()
    })
    it('alerts when unassignFace throws', async () => {
      const ctx = makeCtx()
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            people: [{ id: 'p1', name: 'Stephen', face_index: 2 }],
            unidentified: [], objects: [],
          }),
        })
        .mockResolvedValueOnce({ ok: false })  // unassignFace fails
      global.fetch = fetchMock
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const alertSpy   = vi.spyOn(window, 'alert').mockImplementation(() => {})
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('link', { name: /Stephen/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'Unassign Stephen' }))
      await waitFor(() => expect(alertSpy).toHaveBeenCalled())
      confirmSpy.mockRestore()
      alertSpy.mockRestore()
    })
    it('aborts on declined confirm', async () => {
      const ctx = makeCtx()
      mockDetail({
        people: [{ id: 'p1', name: 'Stephen', face_index: 2 }],
        unidentified: [], objects: [],
      })
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('link', { name: /Stephen/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'Unassign Stephen' }))
      expect(ctx.bumpDetail).not.toHaveBeenCalled()
      confirmSpy.mockRestore()
    })
    it('no-ops when the person has no face_index (chip from a non-face-tagged source)', async () => {
      const ctx = makeCtx()
      mockDetail({
        people: [{ id: 'p1', name: 'Stephen' }],   // no face_index
        unidentified: [], objects: [],
      })
      const confirmSpy = vi.spyOn(window, 'confirm')
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('link', { name: /Stephen/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'Unassign Stephen' }))
      expect(confirmSpy).not.toHaveBeenCalled()
      confirmSpy.mockRestore()
    })
  })

  describe('Unidentified faces', () => {
    it('renders a Thumb per face', async () => {
      const faces = Array.from({ length: 3 }, (_, i) => ({ face_index: i, crop_url: `/c${i}.jpg` }))
      mockDetail({ people: [], unidentified: faces, objects: [] })
      const { container } = renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(container.querySelectorAll('img').length).toBe(3))
    })
    it('caps the visible faces at FACE_PREVIEW-1 + "+N more" when over the limit', async () => {
      const faces = Array.from({ length: 10 }, (_, i) => ({ face_index: i, crop_url: `/c${i}.jpg` }))
      mockDetail({ people: [], unidentified: faces, objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByText('+5')).toBeInTheDocument())
    })
    it('expanding shows all faces + a "less" button', async () => {
      const faces = Array.from({ length: 10 }, (_, i) => ({ face_index: i, crop_url: `/c${i}.jpg` }))
      mockDetail({ people: [], unidentified: faces, objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByText('+5')).toBeInTheDocument())
      fireEvent.click(screen.getByText('+5'))
      expect(screen.getByText('less')).toBeInTheDocument()
    })
    it('clicking "less" collapses back to the preview count', async () => {
      const faces = Array.from({ length: 10 }, (_, i) => ({ face_index: i, crop_url: `/c${i}.jpg` }))
      mockDetail({ people: [], unidentified: faces, objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByText('+5')).toBeInTheDocument())
      fireEvent.click(screen.getByText('+5'))
      fireEvent.click(screen.getByText('less'))
      expect(screen.getByText('+5')).toBeInTheDocument()
    })
    it('clicking a face Thumb fires ctx.openAssign with the face + click coords', async () => {
      const ctx = makeCtx()
      mockDetail({
        people: [], objects: [],
        unidentified: [{ face_index: 0, bbox: [1, 2, 3, 4], crop_url: '/c0.jpg' }],
      })
      const { container } = renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(container.querySelector('img[src="/c0.jpg"]')).not.toBeNull())
      const thumbBtn = container.querySelector('img[src="/c0.jpg"]').closest('button')
      fireEvent.click(thumbBtn, { clientX: 100, clientY: 200 })
      expect(ctx.openAssign).toHaveBeenCalled()
    })
  })

  describe('Select onChange path', () => {
    it('picking an option from the Add-person Select POSTs the tag', async () => {
      const ctx = makeCtx()
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ people: [], unidentified: [], objects: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'p1', name: 'Stephen' }] })
        .mockResolvedValueOnce({ ok: true })  // tagPerson POST
      global.fetch = fetchMock
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(screen.getByRole('button', { name: /Add person/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Add person/ }))
      fireEvent.change(screen.getByPlaceholderText('Add a person…'), { target: { value: 'ste' } })
      await waitFor(() => expect(screen.getByRole('button', { name: /Stephen/ })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Stephen/ }))
      await waitFor(() => expect(ctx.bumpDetail).toHaveBeenCalled())
    })
  })

  describe('Detected objects', () => {
    it('renders a Tag per object with the count suffix when > 1', async () => {
      mockDetail({
        people: [], unidentified: [],
        objects: [{ label: 'dog', count: 1 }, { label: 'cat', count: 3 }],
      })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.getByText('dog')).toBeInTheDocument())
      expect(screen.getByText('cat ×3')).toBeInTheDocument()
    })
  })

  describe('Heritage audio publishing', () => {
    it('pushes audio metadata into ctx.setAudio when the sidecar has it', async () => {
      const ctx = makeCtx()
      mockDetail({
        people: [], unidentified: [], objects: [],
        heritage: { audio_url: '/audio.mp3', audio_description: 'Uncle singing' },
      })
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() =>
        expect(ctx.setAudio).toHaveBeenCalledWith({ url: '/audio.mp3', description: 'Uncle singing' })
      )
    })
    it('clears audio when the next item has no heritage.audio_url', async () => {
      const ctx = makeCtx()
      mockDetail({ people: [], unidentified: [], objects: [] })
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => expect(ctx.setAudio).toHaveBeenCalledWith(null))
    })
  })

  describe('ctx is optional', () => {
    it('renders without ctx (ctx?.setFaces and ctx?.setAudio short-circuit)', async () => {
      mockDetail({
        people: [{ id: 'p1', name: 'PersonName', bbox: [1, 2, 3, 4] }],
        unidentified: [], objects: [],
        heritage: { audio_url: '/a.mp3' },
      })
      renderWithRouter(<MediaDetail item={ITEM} />)
      await waitFor(() => expect(screen.getByRole('link', { name: /PersonName/ })).toBeInTheDocument())
      // No throw — both ctx-optional effects bailed cleanly.
    })
    it('handles detail with missing people array (|| [] fallback)', async () => {
      const ctx = makeCtx()
      mockDetail({
        // people omitted entirely
        unidentified: [{ face_index: 0, bbox: [1, 2, 3, 4] }],
        objects: [],
      })
      renderWithRouter(<MediaDetail item={ITEM} ctx={ctx} />)
      await waitFor(() => {
        const last = ctx.setFaces.mock.calls.at(-1)?.[0]
        expect(Array.isArray(last) && last.length === 1).toBe(true)
      })
    })
  })

  describe('graceful failures', () => {
    it('treats a non-ok detail response as no detail', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false })
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
    })
    it('survives a fetch rejection', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('net'))
      renderWithRouter(<MediaDetail item={ITEM} ctx={makeCtx()} />)
      await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
    })
    it('no-ops when item has no path', () => {
      mockDetail(null)
      renderWithRouter(<MediaDetail item={{}} ctx={makeCtx()} />)
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})
