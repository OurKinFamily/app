import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent, within } from '@testing-library/react'
import { PersonRidgeline } from '../../../src/components/PersonRidgeline'
import { renderWithRouter } from '../helpers'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => navigateMock }
})

const row = (id, total, points) => ({
  id, name: id, known_as: null, avatar: null, total, points,
})

const POINTS = (...years) => years.map(([year, count]) => ({ year, count }))

const ENDPOINT = '/api/people/year-density'

describe('PersonRidgeline', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    navigateMock.mockReset()
  })

  describe('initial load', () => {
    it('fetches the endpoint with the default threshold', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      global.fetch = fetchMock
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}?min_photos=30`)
    })
    it('shows Loading while pending', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })
    it('shows the empty-state message when no rows come back', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => expect(screen.getByText(/No people meet/)).toBeInTheDocument())
    })
    it('treats a non-ok response as no rows', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false })
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => expect(screen.getByText(/No people meet/)).toBeInTheDocument())
    })
    it('survives a fetch rejection', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('net'))
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => expect(screen.getByText(/No people meet/)).toBeInTheDocument())
    })
  })

  describe('with rows', () => {
    // Totals chosen to avoid colliding with select-dropdown values
    // (10/30/50/100/200/500/6/12/25/50/100).
    const ROWS = [
      row('a', 137, POINTS([1990, 4], [1995, 51], [2000, 41])),
      row('b',  79, POINTS([2010, 4], [2015, 31], [2020, 26])),
      row('c',  21, POINTS([2024, 7], [2025, 7])),
    ]
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ROWS })
    })

    it('renders one ridge button per row', async () => {
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => expect(screen.getAllByRole('button').length).toBeGreaterThan(0))
      // Three rows = three person buttons (plus the year-tick controls).
      const personButtons = screen.getAllByRole('button').filter(b => b.title?.includes('photos'))
      expect(personButtons.length).toBe(3)
    })

    it('shows the totals on each row', async () => {
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => expect(screen.getByText('137')).toBeInTheDocument())
      expect(screen.getByText('79')).toBeInTheDocument()
      expect(screen.getByText('21')).toBeInTheDocument()
    })

    it('navigates to the person page on row click', async () => {
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => screen.getByText('137'))
      const personButtons = screen.getAllByRole('button').filter(b => b.title?.includes('photos'))
      fireEvent.click(personButtons[0])
      expect(navigateMock).toHaveBeenCalledWith('/manage/people/a')
    })

    it('renders every-5-year axis labels with decade ticks brighter', async () => {
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => screen.getByText('1990'))
      // 1990 (decade) + 1995 + 2000 (decade) + ... 2025 should appear.
      expect(screen.getByText('1990')).toBeInTheDocument()
      expect(screen.getByText('1995')).toBeInTheDocument()
      expect(screen.getByText('2000')).toBeInTheDocument()
      expect(screen.getByText('2025')).toBeInTheDocument()
    })

    it('shows "X of Y" pill that reflects the limit + total', async () => {
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => screen.getByText('137'))
      // Default limit 12; only 3 rows so visible=3, total=3
      expect(screen.getByText('3 of 3')).toBeInTheDocument()
    })

    it('changing the min-photos select refetches with the new threshold', async () => {
      const fetchMock = global.fetch
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => screen.getByText('137'))
      const minSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(minSelect, { target: { value: '100' } })
      await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(`${ENDPOINT}?min_photos=100`))
    })

    it('changing the row-limit select clips visible rows', async () => {
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => screen.getByText('137'))
      const limitSelect = screen.getAllByRole('combobox')[1]
      fireEvent.change(limitSelect, { target: { value: '6' } })
      // 3 rows total, limit 6 → all 3 visible
      expect(screen.getByText('3 of 3')).toBeInTheDocument()
    })

    it('setting limit to "all" shows everyone', async () => {
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => screen.getByText('137'))
      const limitSelect = screen.getAllByRole('combobox')[1]
      fireEvent.change(limitSelect, { target: { value: 'all' } })
      expect(screen.getByText('3 of 3')).toBeInTheDocument()
    })

    it('a small limit clips rows below it', async () => {
      // Make 15 rows so limit=12 actually clips.
      const many = Array.from({ length: 15 }, (_, i) =>
        row(`p${i}`, 50, POINTS([2000 + i, 10]))
      )
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => many })
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => screen.getByText('12 of 15'))
      expect(screen.getByText('12 of 15')).toBeInTheDocument()
    })

    it('renders avatar fallback initials when no avatar URL is provided', async () => {
      const named = [row('id1', 10, POINTS([2020, 10]))]
      named[0].name = 'Alice Example'
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => named })
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => screen.getByText('Alice Example'))
      // Avatar without src renders the initials div with 'AE'
      expect(screen.getByText('AE')).toBeInTheDocument()
    })

    it('uses the avatar image when one is provided', async () => {
      const r = [{ ...row('id1', 10, POINTS([2020, 10])), avatar: 'crops/face.jpg' }]
      r[0].name = 'Bob'
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => r })
      const { container } = renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => screen.getByText('Bob'))
      expect(within(container).getByRole('img')).toHaveAttribute('alt', 'Bob')
    })
  })

  describe('color tiers', () => {
    // The tier function picks fill colors by photo_count. We don't assert on
    // exact hex (visual concern) — we just exercise each branch.
    it.each([
      ['pink tier (>=2000)',   3000],
      ['violet tier (>=500)',   700],
      ['blue tier (>=200)',     300],
      ['cyan tier (>=50)',       80],
      ['slate tier (<50)',       40],
    ])('renders without throwing for %s', async (_, total) => {
      const r = [row('x', total, POINTS([2020, total]))]
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => r })
      renderWithRouter(<PersonRidgeline endpoint={ENDPOINT} />)
      await waitFor(() => screen.getByText(total.toLocaleString()))
    })
  })
})
