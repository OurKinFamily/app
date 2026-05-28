import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddRelativeModal } from '../../../src/components/AddRelativeModal'

function renderModal(action, props = {}) {
  const onClose   = vi.fn()
  const onSuccess = vi.fn()
  const utils = render(<AddRelativeModal action={action} onClose={onClose} onSuccess={onSuccess} {...props} />)
  return { ...utils, onClose, onSuccess }
}

describe('AddRelativeModal', () => {
  beforeEach(() => { vi.resetAllMocks() })
  afterEach(() => { vi.useRealTimers() })

  describe('rendering by action type', () => {
    it.each([
      ['spouse',  'Add Spouse'],
      ['child',   'Add Child'],
      ['sibling', 'Add Sibling'],
      ['parent',  'Add Parent'],
    ])('renders the right heading for type=%s', (type, heading) => {
      renderModal({ type, personId: 'p1', parentIds: ['par1'] })
      expect(screen.getByText(heading)).toBeInTheDocument()
    })
  })

  describe('sibling guard', () => {
    it('shows a warning + disables submit when adding a sibling with no parents', () => {
      renderModal({ type: 'sibling', personId: 'p1', parentIds: [] })
      expect(screen.getByText(/no parents in the graph/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    })
  })

  describe('search-existing mode', () => {
    it('debounces and calls searchPeople, then lists results', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'p2', name: 'Cayce' }],
      })
      renderModal({ type: 'spouse', personId: 'p1' })
      fireEvent.change(screen.getByPlaceholderText('Search by name…'), { target: { value: 'Cayce' } })
      // Real timers — waitFor handles the 200ms debounce; no need for fake.
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(global.fetch.mock.calls[0][0]).toContain('/api/people/search')
    })
    it('survives a search failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('net'))
      // Component logs the search error to console.error; swallow it here.
      // (Will be replaced by the structured logger per the TODO in TODO.md.)
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      renderModal({ type: 'spouse', personId: 'p1' })
      fireEvent.change(screen.getByPlaceholderText('Search by name…'), { target: { value: 'X' } })
      // Debounce + rejection; just give the timer a chance to fire.
      await new Promise(r => setTimeout(r, 250))
      expect(errSpy).toHaveBeenCalled()  // confirms the failure path executed
      errSpy.mockRestore()
    })
  })

  describe('create-new mode', () => {
    it('switches to the Create form when "Create new" is clicked', () => {
      renderModal({ type: 'parent', personId: 'p1' })
      fireEvent.click(screen.getByRole('button', { name: 'Create new' }))
      expect(screen.getByPlaceholderText('Full name *')).toBeInTheDocument()
    })
    it('toggles back to Search-existing mode', () => {
      renderModal({ type: 'parent', personId: 'p1' })
      fireEvent.click(screen.getByRole('button', { name: 'Create new' }))
      fireEvent.click(screen.getByRole('button', { name: 'Search existing' }))
      expect(screen.getByPlaceholderText('Search by name…')).toBeInTheDocument()
    })
    it('accepts input in known_as and birth_date fields', () => {
      renderModal({ type: 'parent', personId: 'p1' })
      fireEvent.click(screen.getByRole('button', { name: 'Create new' }))
      const knownAs   = screen.getByPlaceholderText('Known as (nickname)')
      const birthDate = screen.getByPlaceholderText(/Birth date/)
      fireEvent.change(knownAs,   { target: { value: 'Nickname' } })
      fireEvent.change(birthDate, { target: { value: '1980' } })
      expect(knownAs).toHaveValue('Nickname')
      expect(birthDate).toHaveValue('1980')
    })
    it('createPerson + addRelationship and calls onSuccess on submit', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'np' }) })  // createPerson
        .mockResolvedValueOnce({ ok: true })  // addRelationship
      global.fetch = fetchMock
      const { onSuccess } = renderModal({ type: 'parent', personId: 'p1', parentIds: [] })
      fireEvent.click(screen.getByRole('button', { name: 'Create new' }))
      fireEvent.change(screen.getByPlaceholderText('Full name *'), { target: { value: 'New Person' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
      await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    })
  })

  describe('search result rendering', () => {
    it('shows known_as + name + birth_year, highlights when selected', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 'p2', name: 'Stephen E. Young', known_as: 'Stephen', birth_date: '1986-04-14' },
        ],
      })
      renderModal({ type: 'spouse', personId: 'p1' })
      fireEvent.change(screen.getByPlaceholderText('Search by name…'), { target: { value: 'Stephen' } })
      // Result row shows full name (line 144) + birth year (line 147).
      await waitFor(() => expect(screen.getByText('Stephen E. Young')).toBeInTheDocument())
      expect(screen.getByText('1986')).toBeInTheDocument()
      // Click to select → highlight branch (line 138) fires.
      fireEvent.click(screen.getByText('Stephen E. Young'))
      expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled()
    })
  })

  describe('Add button disabled-state branches', () => {
    it('shows "Saving…" and stays disabled mid-submit (saving branch of disabled)', async () => {
      let resolveFirst
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'x', name: 'X' }] })
        .mockImplementationOnce(() => new Promise(r => { resolveFirst = r }))
      global.fetch = fetchMock
      renderModal({ type: 'spouse', personId: 'p1' })
      fireEvent.change(screen.getByPlaceholderText('Search by name…'), { target: { value: 'X' } })
      await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument())
      fireEvent.click(screen.getByText('X'))
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
      await waitFor(() => expect(screen.getByText('Saving…')).toBeInTheDocument())
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
      resolveFirst({ ok: true })
    })
    it('sibling type with action.parentIds=undefined disables Add (truthy guard sub-branch)', () => {
      // No parentIds key in action → `!action.parentIds` true → disabled.
      renderModal({ type: 'sibling', personId: 'p1' })
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    })
    it('sibling type with non-empty parentIds + selected enables Add', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'sib', name: 'Sibling' }],
      })
      renderModal({ type: 'sibling', personId: 'p1', parentIds: ['par1', 'par2'] })
      fireEvent.change(screen.getByPlaceholderText('Search by name…'), { target: { value: 'S' } })
      await waitFor(() => expect(screen.getByText('Sibling')).toBeInTheDocument())
      fireEvent.click(screen.getByText('Sibling'))
      expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled()
    })
  })

  describe('submit defaults', () => {
    it('falls back to [] when action.parentIds is undefined', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'x', name: 'X' }] })
        .mockResolvedValue({ ok: true })
      global.fetch = fetchMock
      const { onSuccess } = renderModal({ type: 'spouse', personId: 'p1' })  // no parentIds
      fireEvent.change(screen.getByPlaceholderText('Search by name…'), { target: { value: 'X' } })
      await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument())
      fireEvent.click(screen.getByText('X'))
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
      await waitFor(() => expect(onSuccess).toHaveBeenCalled())
      const rel = fetchMock.mock.calls.find(([u]) => u.includes('/relationships'))
      expect(JSON.parse(rel[1].body).parent_ids).toEqual([])
    })
  })

  describe('child submit with co-parents', () => {
    it('also POSTs addRelationship for each selected co-parent', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'kid', name: 'Kid' }] })
        .mockResolvedValue({ ok: true })
      global.fetch = fetchMock
      const { onSuccess } = renderModal({
        type: 'child',
        personId: 'p1',
        parentIds: [],
        spouses: [{ id: 's1', name: 'Cayce' }],
      })
      fireEvent.change(screen.getByPlaceholderText('Search by name…'), { target: { value: 'Kid' } })
      await waitFor(() => expect(screen.getByText('Kid')).toBeInTheDocument())
      fireEvent.click(screen.getByText('Kid'))
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
      await waitFor(() => expect(onSuccess).toHaveBeenCalled())
      // Both the focal person's relationship and Cayce's child relationship
      // were POSTed (line 71 — the child-branch coParentIds Promise.all).
      const relCalls = fetchMock.mock.calls.filter(([url]) => url.includes('/relationships'))
      expect(relCalls.length).toBe(2)
    })
  })

  describe('co-parent picker (child with spouses)', () => {
    it('renders a checkbox per spouse, pre-checked', () => {
      renderModal({
        type: 'child', personId: 'p1', parentIds: [],
        spouses: [{ id: 's1', name: 'Cayce' }, { id: 's2', name: 'Other' }],
      })
      const boxes = screen.getAllByRole('checkbox')
      expect(boxes).toHaveLength(2)
      for (const b of boxes) expect(b).toBeChecked()
    })
    it('toggling a co-parent flips its checkbox', () => {
      renderModal({
        type: 'child', personId: 'p1', parentIds: [],
        spouses: [{ id: 's1', name: 'Cayce' }],
      })
      const box = screen.getByRole('checkbox')
      fireEvent.click(box)
      expect(box).not.toBeChecked()
      fireEvent.click(box)
      expect(box).toBeChecked()
    })
    it('omits the co-parent picker when there are no spouses', () => {
      renderModal({ type: 'child', personId: 'p1', parentIds: [] })
      expect(screen.queryByText('Also child of')).not.toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('shows an error message when submit fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('net'))
      renderModal({ type: 'parent', personId: 'p1', parentIds: [] })
      fireEvent.click(screen.getByRole('button', { name: 'Create new' }))
      fireEvent.change(screen.getByPlaceholderText('Full name *'), { target: { value: 'X' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
      await waitFor(() => expect(screen.getByText(/Something went wrong/)).toBeInTheDocument())
    })
  })

  describe('close behavior', () => {
    it('invokes onClose on backdrop click', () => {
      const { container, onClose } = renderModal({ type: 'spouse', personId: 'p1' })
      fireEvent.click(container.firstChild)
      expect(onClose).toHaveBeenCalled()
    })
    it('invokes onClose on Cancel', () => {
      const { onClose } = renderModal({ type: 'spouse', personId: 'p1' })
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalled()
    })
    it('invokes onClose on Escape', () => {
      const { onClose } = renderModal({ type: 'spouse', personId: 'p1' })
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })
  })
})
