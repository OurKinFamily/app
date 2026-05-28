import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { LifeStagesStrip } from '../../../src/components/LifeStagesStrip'
import { renderWithRouter, mockFetch, mockFetchFail } from '../helpers'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => navigateMock }
})

const tile = (overrides = {}) => ({
  bucket: 'kid',
  age_text: 'age 8',
  path: 'archive/1994/05/p.jpg',
  url: '/api/media/archive/1994/05/p.jpg',
  thumb_url: '/api/media/thumb/archive/1994/05/p.jpg',
  crop_url: null,
  is_video: false,
  count: 3,
  locked: false,
  ...overrides,
})

// Router that maps URL → mocked Response. Lets us drive different
// endpoints (list / candidates / lock PUT / unlock DELETE) from one
// test without hand-sequencing each call.
function setupRouter(routes) {
  global.fetch = vi.fn().mockImplementation((url, init = {}) => {
    const method = init.method || 'GET'
    const key = `${method} ${url.split('?')[0]}`
    const handler = routes[key]
    if (!handler) {
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
    }
    const out = handler(url, init)
    return Promise.resolve({
      ok: out.ok ?? true,
      status: out.status ?? 200,
      json: async () => out.data ?? {},
    })
  })
  return global.fetch
}

describe('LifeStagesStrip', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    navigateMock.mockReset()
  })

  describe('initial load', () => {
    it('renders nothing while loading', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      expect(container.textContent).toBe('')
    })
    it('renders nothing when the API returns no buckets', async () => {
      mockFetch({ buckets: [] })
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(container.textContent).toBe('')
    })
    it('renders nothing on a non-ok response', async () => {
      mockFetch(null, { ok: false })
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(container.textContent).toBe('')
    })
    it('survives a fetch rejection without throwing', async () => {
      mockFetchFail(new Error('net'))
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(container.textContent).toBe('')
    })
    it('skips the fetch entirely when no personId is supplied', () => {
      const fn = vi.fn()
      global.fetch = fn
      renderWithRouter(<LifeStagesStrip personId={null} />)
      expect(fn).not.toHaveBeenCalled()
    })
    it('falls back to an empty array when the response lacks `buckets`', async () => {
      mockFetch({})
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(container.textContent).toBe('')
    })
  })

  describe('with rows', () => {
    const baseRoutes = (initial) => ({
      'GET /api/people/p1/life-stages': () => ({ data: { buckets: initial } }),
    })

    it('renders one tile per bucket with the age caption', async () => {
      setupRouter(baseRoutes([
        tile({ bucket: 'baby',    age_text: 'newborn', path: 'a.jpg' }),
        tile({ bucket: 'toddler', age_text: 'age 2',   path: 'b.jpg' }),
      ]))
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => expect(screen.getByText('Through the years')).toBeInTheDocument())
      expect(screen.getByText('newborn')).toBeInTheDocument()
      expect(screen.getByText('age 2')).toBeInTheDocument()
    })

    it('clicking the tile photo navigates to /gallery/photo/<path>', async () => {
      setupRouter(baseRoutes([tile({ path: 'archive/1994/05/p.jpg' })]))
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      const navBtn = screen.getByTitle(/kid · 3 photos/)
      fireEvent.click(navBtn)
      expect(navigateMock).toHaveBeenCalledWith('/gallery/photo/archive/1994/05/p.jpg')
    })

    it('renders the face crop overlay when crop_url is present', async () => {
      setupRouter(baseRoutes([tile({ crop_url: '/api/media/__faces/crops/x.jpg' })]))
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      expect(container.querySelectorAll('img').length).toBe(2)
    })

    it('omits the crop overlay when crop_url is null', async () => {
      setupRouter(baseRoutes([tile({ crop_url: null })]))
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      expect(container.querySelectorAll('img').length).toBe(1)
    })

    it('builds a title attribute that uses singular "photo" for count=1', async () => {
      setupRouter(baseRoutes([tile({ count: 1 })]))
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      expect(screen.getByTitle('kid · 1 photo')).toBeInTheDocument()
    })

    it('builds a title attribute that uses plural "photos" for count>1', async () => {
      setupRouter(baseRoutes([tile({ count: 4 })]))
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      expect(screen.getByTitle('kid · 4 photos')).toBeInTheDocument()
    })

    it('shows the lock badge when a tile is locked (and clean)', async () => {
      setupRouter(baseRoutes([tile({ locked: true })]))
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      // The lock indicator sits on the tile + has a known class palette.
      // Counting the lucide-react SVGs is brittle; instead, query the
      // pinned indicator span by its absolute positioning class.
      expect(container.querySelector('.text-emerald-400')).toBeTruthy()
    })

    it('does not show a cycle button when count is 1', async () => {
      setupRouter(baseRoutes([tile({ count: 1 })]))
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      expect(screen.queryByTitle(/Next of/)).not.toBeInTheDocument()
    })
  })

  describe('cycle / lock / unlock', () => {
    const ALT = tile({ bucket: 'kid', path: 'b.jpg', thumb_url: '/api/media/thumb/b.jpg', count: 2 })
    const FIRST = tile({ bucket: 'kid', path: 'a.jpg', thumb_url: '/api/media/thumb/a.jpg', count: 2 })

    function routes(extra = {}) {
      return {
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [{ ...FIRST }] } }),
        'GET /api/people/p1/life-stages/kid/candidates':
          () => ({ data: { candidates: [{ ...FIRST }, { ...ALT }] } }),
        ...extra,
      }
    }

    it('cycle button fetches candidates then swaps the visible thumb', async () => {
      setupRouter(routes())
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Next of/))
      await waitFor(() => {
        const navBtn = screen.getByTitle(/kid · 2 photos/)
        expect(navBtn.querySelector('img')).toHaveAttribute('src', '/api/media/thumb/b.jpg')
      })
    })

    it('cycle is a no-op when only one candidate exists', async () => {
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [tile({ count: 2 })] } }),
        'GET /api/people/p1/life-stages/kid/candidates':
          () => ({ data: { candidates: [tile()] } }),
      })
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Next of/))
      // No throw; tile unchanged.
      await waitFor(() => screen.getByTitle(/kid · 2 photos/))
    })

    it('cycle treats zero candidates as a no-op', async () => {
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [tile({ count: 2 })] } }),
        'GET /api/people/p1/life-stages/kid/candidates':
          () => ({ data: { candidates: [] } }),
      })
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Next of/))
      // No throw.
    })

    it('cycle treats a non-ok candidates response as a no-op', async () => {
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [tile({ count: 2 })] } }),
        'GET /api/people/p1/life-stages/kid/candidates':
          () => ({ ok: false, status: 500 }),
      })
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Next of/))
      // No throw.
    })

    it('cycling one tile in a multi-bucket strip leaves the other untouched', async () => {
      const A = tile({ bucket: 'baby', path: 'baby1.jpg', thumb_url: '/api/media/thumb/baby1.jpg', count: 2, age_text: 'newborn' })
      const B = tile({ bucket: 'kid',  path: 'kid1.jpg',  thumb_url: '/api/media/thumb/kid1.jpg',  count: 2, age_text: 'age 8' })
      const B2 = tile({ bucket: 'kid', path: 'kid2.jpg',  thumb_url: '/api/media/thumb/kid2.jpg',  count: 2, age_text: 'age 8' })
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [A, B] } }),
        'GET /api/people/p1/life-stages/kid/candidates':
          () => ({ data: { candidates: [B, B2] } }),
      })
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('newborn'))
      // Both buckets have count=2 → two "Next of 2" buttons. The kid
      // bucket renders second, so getAllByTitle()[1] is its cycle button.
      const cycleButtons = screen.getAllByTitle(/Next of 2/)
      fireEvent.click(cycleButtons[1])
      await waitFor(() => {
        const kidNav = screen.getByTitle(/kid · 2 photos/)
        expect(kidNav.querySelector('img')).toHaveAttribute('src', '/api/media/thumb/kid2.jpg')
      })
      // Baby tile unchanged.
      const babyNav = screen.getByTitle(/baby · 2 photos/)
      expect(babyNav.querySelector('img')).toHaveAttribute('src', '/api/media/thumb/baby1.jpg')
    })

    it('lock click PUTs to /life-stages and flips to locked', async () => {
      const putSpy = vi.fn().mockReturnValue({ data: { ok: true } })
      setupRouter(routes({ 'PUT /api/people/p1/life-stages': putSpy }))
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Lock as this person/))
      await waitFor(() => expect(putSpy).toHaveBeenCalled())
      const [, init] = putSpy.mock.calls[0]
      expect(JSON.parse(init.body)).toEqual({ bucket: 'kid', path: 'a.jpg' })
      await waitFor(() => expect(container.querySelector('.text-emerald-400')).toBeTruthy())
    })

    it('lock failure leaves the tile unlocked', async () => {
      setupRouter({
        ...routes(),
        'PUT /api/people/p1/life-stages': () => ({ ok: false, status: 500 }),
      })
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Lock as this person/))
      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/life-stages'),
        expect.objectContaining({ method: 'PUT' }),
      ))
      expect(container.querySelector('.text-emerald-400')).toBeFalsy()
    })

    it('unlock click DELETEs and reloads the strip', async () => {
      const deleteSpy = vi.fn().mockReturnValue({ data: {} })
      // First GET returns a locked tile; after delete+reload, returns unlocked.
      let getCount = 0
      setupRouter({
        'GET /api/people/p1/life-stages': () => {
          getCount += 1
          return { data: { buckets: [{ ...FIRST, locked: getCount === 1 }] } }
        },
        'DELETE /api/people/p1/life-stages/kid': deleteSpy,
      })
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Unlock/))
      await waitFor(() => expect(deleteSpy).toHaveBeenCalled())
      expect(deleteSpy.mock.calls[0][1].method).toBe('DELETE')
    })

    it('unlock failure leaves the locked badge in place', async () => {
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [{ ...FIRST, locked: true }] } }),
        'DELETE /api/people/p1/life-stages/kid': () => ({ ok: false }),
      })
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Unlock/))
      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/life-stages/kid'),
        expect.objectContaining({ method: 'DELETE' }),
      ))
      expect(container.querySelector('.text-emerald-400')).toBeTruthy()
    })

    it('cycling after lock marks the bucket dirty (Save button replaces Unlock)', async () => {
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [{ ...FIRST, locked: true }] } }),
        'GET /api/people/p1/life-stages/kid/candidates':
          () => ({ data: { candidates: [{ ...FIRST }, { ...ALT }] } }),
      })
      renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Next of/))
      await waitFor(() => expect(screen.getByTitle(/Save this one/)).toBeInTheDocument())
    })
  })

  describe('wheel-to-horizontal scroll', () => {
    it('converts vertical wheel delta into horizontal scrollLeft', async () => {
      mockFetch({ buckets: [tile()] })
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      const scroller = container.querySelector('.overflow-x-auto')
      scroller.scrollLeft = 0
      fireEvent.wheel(scroller, { deltaY: 120 })
      expect(scroller.scrollLeft).toBe(120)
    })

    it('ignores wheel events whose deltaY is 0', async () => {
      mockFetch({ buckets: [tile()] })
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      const scroller = container.querySelector('.overflow-x-auto')
      scroller.scrollLeft = 50
      fireEvent.wheel(scroller, { deltaY: 0 })
      expect(scroller.scrollLeft).toBe(50)
    })
  })
})
