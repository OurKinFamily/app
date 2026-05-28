import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { PersonLifeStages } from '../../../src/components/PersonLifeStages'
import { renderWithRouter, mockFetch, mockFetchFail } from '../helpers'

const tile = (overrides = {}) => ({
  bucket: 'kid',
  age_text: 'age 8',
  path: 'archive/1994/05/a.jpg',
  url: '/api/media/archive/1994/05/a.jpg',
  thumb_url: '/api/media/thumb/archive/1994/05/a.jpg',
  crop_url: null,
  is_video: false,
  count: 3,
  locked: false,
  ...overrides,
})

// Per-URL router so cycle / lock / unlock paths can all be exercised.
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

describe('PersonLifeStages', () => {
  beforeEach(() => { vi.resetAllMocks() })

  describe('initial load', () => {
    it('renders nothing while loading', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
      const { container } = renderWithRouter(<PersonLifeStages personId="p1" />)
      expect(container.textContent).toBe('')
    })

    it('renders nothing when the API returns no buckets', async () => {
      mockFetch({ buckets: [] })
      const { container } = renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(container.textContent).toBe('')
    })

    it('renders nothing on a non-ok response', async () => {
      mockFetch(null, { ok: false })
      const { container } = renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(container.textContent).toBe('')
    })

    it('survives a fetch rejection without throwing', async () => {
      mockFetchFail(new Error('net'))
      const { container } = renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(container.textContent).toBe('')
    })

    it('skips the fetch when no personId is supplied', () => {
      const fn = vi.fn()
      global.fetch = fn
      renderWithRouter(<PersonLifeStages personId={null} />)
      expect(fn).not.toHaveBeenCalled()
    })

    it('falls back to an empty buckets list when the body lacks `buckets`', async () => {
      mockFetch({})
      const { container } = renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(container.textContent).toBe('')
    })
  })

  describe('with rows', () => {
    const baseRoutes = (initial) => ({
      'GET /api/people/p1/life-stages':
        () => ({ data: { buckets: initial } }),
    })

    it('renders the "Reeling in the years" heading', async () => {
      setupRouter(baseRoutes([tile()]))
      renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => expect(screen.getByText('Reeling in the years')).toBeInTheDocument())
    })

    it('renders one StripFrame caption per bucket', async () => {
      setupRouter(baseRoutes([
        tile({ bucket: 'baby',    age_text: 'newborn', path: 'a.jpg' }),
        tile({ bucket: 'toddler', age_text: 'age 2',   path: 'b.jpg' }),
      ]))
      renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('newborn'))
      expect(screen.getByText('newborn')).toBeInTheDocument()
      expect(screen.getByText('age 2')).toBeInTheDocument()
    })

    it('does not render a cycle button when count is 1', async () => {
      setupRouter(baseRoutes([tile({ count: 1 })]))
      renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      expect(screen.queryByTitle(/Next of/)).not.toBeInTheDocument()
    })
  })

  describe('cycle / lock / unlock', () => {
    const ALT  = tile({ bucket: 'kid', path: 'b.jpg', thumb_url: '/api/media/thumb/b.jpg', count: 2 })
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

    it('cycle button fetches candidates and swaps the visible thumb', async () => {
      setupRouter(routes())
      const { container } = renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Next of/))
      await waitFor(() => {
        expect(container.querySelector('img').getAttribute('src')).toBe('/api/media/thumb/b.jpg')
      })
    })

    it('cycle no-ops when only one candidate exists', async () => {
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [tile({ count: 2 })] } }),
        'GET /api/people/p1/life-stages/kid/candidates':
          () => ({ data: { candidates: [tile()] } }),
      })
      renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Next of/))
    })

    it('cycle treats zero candidates as a no-op', async () => {
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [tile({ count: 2 })] } }),
        'GET /api/people/p1/life-stages/kid/candidates':
          () => ({ data: { candidates: [] } }),
      })
      renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Next of/))
    })

    it('cycle treats a non-ok candidates response as a no-op', async () => {
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [tile({ count: 2 })] } }),
        'GET /api/people/p1/life-stages/kid/candidates':
          () => ({ ok: false, status: 500 }),
      })
      renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Next of/))
    })

    it('cycling one bucket in a multi-bucket strip leaves the other untouched', async () => {
      const A  = tile({ bucket: 'baby', path: 'baby1.jpg', thumb_url: '/api/media/thumb/baby1.jpg', count: 2, age_text: 'newborn' })
      const B  = tile({ bucket: 'kid',  path: 'kid1.jpg',  thumb_url: '/api/media/thumb/kid1.jpg',  count: 2, age_text: 'age 8' })
      const B2 = tile({ bucket: 'kid',  path: 'kid2.jpg',  thumb_url: '/api/media/thumb/kid2.jpg',  count: 2, age_text: 'age 8' })
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [A, B] } }),
        'GET /api/people/p1/life-stages/kid/candidates':
          () => ({ data: { candidates: [B, B2] } }),
      })
      const { container } = renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('newborn'))
      const cycles = screen.getAllByTitle(/Next of 2/)
      // 2 buckets, both count=2 → 2 cycle buttons; click the kid one (index 1)
      fireEvent.click(cycles[1])
      await waitFor(() => {
        const imgs = container.querySelectorAll('img')
        const srcs = Array.from(imgs).map(i => i.getAttribute('src'))
        expect(srcs).toContain('/api/media/thumb/kid2.jpg')
        expect(srcs).toContain('/api/media/thumb/baby1.jpg')
      })
    })

    it('lock click PUTs and flips to locked', async () => {
      const putSpy = vi.fn().mockReturnValue({ data: { ok: true } })
      setupRouter(routes({ 'PUT /api/people/p1/life-stages': putSpy }))
      renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Lock as this person/))
      await waitFor(() => expect(putSpy).toHaveBeenCalled())
      const [, init] = putSpy.mock.calls[0]
      expect(JSON.parse(init.body)).toEqual({ bucket: 'kid', path: 'a.jpg' })
      await waitFor(() => expect(screen.getByTitle(/Unlock/)).toBeInTheDocument())
    })

    it('lock failure leaves the tile unlocked', async () => {
      setupRouter({
        ...routes(),
        'PUT /api/people/p1/life-stages': () => ({ ok: false, status: 500 }),
      })
      renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Lock as this person/))
      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/life-stages'),
        expect.objectContaining({ method: 'PUT' }),
      ))
      expect(screen.queryByTitle(/Unlock/)).not.toBeInTheDocument()
    })

    it('unlock click DELETEs and reloads', async () => {
      const deleteSpy = vi.fn().mockReturnValue({ data: {} })
      let getCount = 0
      setupRouter({
        'GET /api/people/p1/life-stages': () => {
          getCount += 1
          return { data: { buckets: [{ ...FIRST, locked: getCount === 1 }] } }
        },
        'DELETE /api/people/p1/life-stages/kid': deleteSpy,
      })
      renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Unlock/))
      await waitFor(() => expect(deleteSpy).toHaveBeenCalled())
      expect(deleteSpy.mock.calls[0][1].method).toBe('DELETE')
    })

    it('unlock failure keeps the bucket locked', async () => {
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [{ ...FIRST, locked: true }] } }),
        'DELETE /api/people/p1/life-stages/kid': () => ({ ok: false }),
      })
      renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Unlock/))
      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/life-stages/kid'),
        expect.objectContaining({ method: 'DELETE' }),
      ))
      expect(screen.getByTitle(/Unlock/)).toBeInTheDocument()
    })

    it('cycling after lock turns the lock button into "Save this one"', async () => {
      setupRouter({
        'GET /api/people/p1/life-stages':
          () => ({ data: { buckets: [{ ...FIRST, locked: true }] } }),
        'GET /api/people/p1/life-stages/kid/candidates':
          () => ({ data: { candidates: [{ ...FIRST }, { ...ALT }] } }),
      })
      renderWithRouter(<PersonLifeStages personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      fireEvent.click(screen.getByTitle(/Next of/))
      await waitFor(() => expect(screen.getByTitle(/Save this one/)).toBeInTheDocument())
    })
  })
})
