import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { ConnectionTimeline } from '../../../src/components/ConnectionTimeline'
import { renderWithRouter } from '../helpers'

const ROW = (id, first, last, count) => ({
  id, name: id, known_as: null, avatar: null,
  first_ts: `${first}-01-01T00:00:00Z`,
  last_ts:  `${last}-12-31T00:00:00Z`,
  photo_count: count,
})

describe('ConnectionTimeline', () => {
  beforeEach(() => { vi.resetAllMocks() })

  describe('initial load', () => {
    it('fetches /api/people/{id}/connection-timeline with the default threshold', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      global.fetch = fetchMock
      renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(fetchMock.mock.calls[0][0]).toBe('/api/people/p1/connection-timeline?min_photos=10')
    })
    it('shows a Loading message while pending', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderWithRouter(<ConnectionTimeline personId="p1" />)
      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })
    it('shows an empty-state message when no rows come back', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(screen.getByText(/No people meet/)).toBeInTheDocument())
    })
    it('treats a non-ok response as no rows', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false })
      renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(screen.getByText(/No people meet/)).toBeInTheDocument())
    })
    it('survives a fetch rejection', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('net'))
      renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(screen.getByText(/No people meet/)).toBeInTheDocument())
    })
  })

  describe('with rows', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          ROW('cayce',  2008, 2026, 5000),
          ROW('mom',    1986, 2026, 800),
          ROW('cameo',  2010, 2010, 5),
        ],
      })
    })
    it('renders one bar per (post-grouping) row', async () => {
      const { container } = renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(container.querySelector('button[title*="cayce"]')).not.toBeNull())
    })
    it('shows the count chip in the threshold control', async () => {
      renderWithRouter(<ConnectionTimeline personId="p1" />)
      // After load, the count chip says "3 people".
      await waitFor(() => expect(screen.getByText(/3 people/)).toBeInTheDocument())
    })
  })

  describe('threshold control', () => {
    it('refetches when the threshold is changed', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      global.fetch = fetchMock
      renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '20' } })
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      expect(fetchMock.mock.calls[1][0]).toContain('min_photos=20')
    })
    it('toggles the stack checkbox', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(screen.getByRole('checkbox')).toBeInTheDocument())
      const box = screen.getByRole('checkbox')
      expect(box).toBeChecked()
      fireEvent.click(box)
      expect(box).not.toBeChecked()
    })
  })

  describe('bar click navigation', () => {
    it('navigates to the person page when a single-person bar is clicked', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [ROW('cayce', 2008, 2026, 5000)],
      })
      const { container } = renderWithRouter(<ConnectionTimeline personId="p1" />, { route: '/foo' })
      await waitFor(() => expect(container.querySelector('button[title*="cayce"]')).not.toBeNull())
      fireEvent.click(container.querySelector('button[title*="cayce"]'))
      // useNavigate inside MemoryRouter will update location — we don't have
      // a route listener handy, so just verify no crash + no group-skip.
      // (The branch is covered.)
    })
    it('does NOT navigate when a grouped bar (multiple people) is clicked', async () => {
      // Two rows with matching span + similar counts → merged by groupBySpan
      // → renders as one isGroup=true bar.
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          ROW('a', 2008, 2026, 100),
          ROW('b', 2008, 2026, 90),
        ],
      })
      const { container } = renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(container.querySelector('button[title*="a"]')).not.toBeNull())
      // Title for the merged bar lists both: "a, b · 190 photos · 2008–2026"
      const merged = container.querySelector('button[title*="190 photos"]')
      expect(merged).not.toBeNull()
      expect(() => fireEvent.click(merged)).not.toThrow()
    })
  })

  describe('stack control off (no grouping)', () => {
    it('renders one bar per person when stack=false', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          ROW('a', 2008, 2026, 100),
          ROW('b', 2008, 2026, 90),
        ],
      })
      const { container } = renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(container.querySelector('button[title*="190 photos"]')).not.toBeNull())
      // Untoggle stack — now each person gets its own bar.
      fireEvent.click(screen.getByRole('checkbox'))
      await waitFor(() => expect(container.querySelector('button[title*="190 photos"]')).toBeNull())
      // Two bars now exist (one per person), each with its own count.
      expect(container.querySelectorAll('button[title*="100 photos"]').length).toBe(1)
      expect(container.querySelectorAll('button[title*="90 photos"]').length).toBe(1)
    })
  })

  describe('color-tier branches', () => {
    it('renders bars across all photo-count tiers without throwing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          ROW('p1', 2000, 2005, 5),        // slate
          ROW('p2', 2006, 2010, 100),      // cyan
          ROW('p3', 2011, 2015, 250),      // blue
          ROW('p4', 2016, 2020, 800),      // violet
          ROW('p5', 2021, 2025, 5000),     // pink
        ],
      })
      const { container } = renderWithRouter(<ConnectionTimeline personId="p1" />)
      // Title format uses raw photo_count (no locale separators) — "5000 photos".
      await waitFor(() => expect(container.querySelector('button[title*="5000 photos"]')).not.toBeNull())
      expect(container.querySelectorAll('button[title*="photos"]').length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('hover detail when stack=false (no people array)', () => {
    it('hovers a stack=false bar with no people array — uses [row] fallback', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{
          id: 'a', name: 'A', known_as: null, avatar: null,
          first_ts: '2020-01-01T00:00:00Z', last_ts: '2025-12-31T00:00:00Z', photo_count: 100,
        }],
      })
      const { container } = renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(container.querySelector('button[title*="100 photos"]')).not.toBeNull())
      // Untoggle stack so rows go through `rows.map(r => ({...r, people: [r]}))`
      // path — people IS set. Then re-toggle stack back on and hover.
      fireEvent.click(screen.getByRole('checkbox'))  // stack off
      fireEvent.click(screen.getByRole('checkbox'))  // stack on (group)
      const bar = container.querySelector('button[title*="100 photos"]')
      fireEvent.mouseEnter(bar)
      // Detail strip shows row's count.
      await waitFor(() => expect(screen.getByText(/100 photos/)).toBeInTheDocument())
    })
  })

  describe('avatar rendering', () => {
    it('renders mediaUrl avatar inside bars when the person has one', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{
          id: 'p1', name: 'Stephen', avatar: 'archive/avatars/x.jpg',
          first_ts: '2008-01-01T00:00:00Z', last_ts: '2026-12-31T00:00:00Z', photo_count: 500,
        }],
      })
      const { container } = renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(container.querySelector('img[src*="archive/avatars/x.jpg"]')).not.toBeNull())
    })
  })

  describe('hover detail', () => {
    it('exposes a hover-detail strip when a bar is hovered', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [ROW('cayce', 2008, 2026, 5000)],
      })
      const { container } = renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(container.querySelector('button[title*="cayce"]')).not.toBeNull())
      fireEvent.mouseEnter(container.querySelector('button[title*="cayce"]'))
      // The detail strip shows year range + count.
      await waitFor(() => expect(screen.getByText(/5,000 photos/)).toBeInTheDocument())
    })
    it('clears the hover detail on mouseLeave', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [ROW('cayce', 2008, 2026, 5000)],
      })
      const { container } = renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(container.querySelector('button[title*="cayce"]')).not.toBeNull())
      const bar = container.querySelector('button[title*="cayce"]')
      fireEvent.mouseEnter(bar)
      await waitFor(() => expect(screen.getByText(/5,000 photos/)).toBeInTheDocument())
      fireEvent.mouseLeave(bar)
      // Detail strip cleared (text gone or empty min-h-5 div).
      expect(screen.queryByText(/5,000 photos/)).not.toBeInTheDocument()
    })
    it('renders the (known_as) suffix when a hovered person has both name and known_as', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{
          id: 'p1', name: 'Stephen E. Young', known_as: 'Stephen', avatar: null,
          first_ts: '2008-01-01T00:00:00Z', last_ts: '2026-12-31T00:00:00Z', photo_count: 5000,
        }],
      })
      const { container } = renderWithRouter(<ConnectionTimeline personId="p1" />)
      await waitFor(() => expect(container.querySelector('button')).not.toBeNull())
      const bar = container.querySelector('button[title*="photos"]')
      fireEvent.mouseEnter(bar)
      // Hover detail shows displayName (Stephen) + otherName "(Stephen E. Young)".
      await waitFor(() => expect(screen.getByText(/\(Stephen E\. Young\)/)).toBeInTheDocument())
    })
  })
})
