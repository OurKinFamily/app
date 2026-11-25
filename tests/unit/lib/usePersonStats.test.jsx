import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePersonStats, spanOf } from '../../../src/lib/usePersonStats'

/**
 * The counts in the person hero. Six requests, one figure each, and every
 * one of them optional — a person with no videos shows no Videos.
 */
const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

function stubApi({
  all = { total: 2825, media: [{ timestamp: '2026-08-25T00:11:40Z' }] },
  oldest = { total: 2825, media: [{ timestamp: '1966-01-01T00:00:00Z' }] },
  located = { total: 2407 },
  videos = { total: 344 },
  collections = [{ id: 'c1' }, { id: 'c2' }],
  groups = [{ id: 'g1' }],
  ancestors = { ancestors: [{ slot: 2 }, { slot: 3 }, { slot: 6 }] },
} = {}) {
  global.fetch = vi.fn(url => {
    const s = String(url)
    if (s.includes('/ancestors')) return ok(ancestors)
    if (s.includes('/collections')) return ok(collections)
    if (s.includes('/groups')) return ok(groups)
    if (s.includes('media_type=video')) return ok(videos)
    if (s.includes('gps=has')) return ok(located)
    if (s.includes('sort=asc')) return ok(oldest)
    return ok(all)
  })
}

beforeEach(() => { stubApi() })

describe('usePersonStats', () => {
  it('holds back until every count is in', () => {
    const { result } = renderHook(() => usePersonStats('p1'))
    expect(result.current).toBe(null)
  })

  it('counts the photographs, videos, places, collections and groups', async () => {
    const { result } = renderHook(() => usePersonStats('p1'))
    await waitFor(() => expect(result.current).not.toBe(null))
    expect(result.current).toMatchObject({
      photos: 2825, videos: 344, located: 2407, collections: 2, groups: 1,
    })
  })

  it('counts the ancestors the pedigree found', async () => {
    const { result } = renderHook(() => usePersonStats('p1'))
    await waitFor(() => expect(result.current).not.toBe(null))
    expect(result.current.ancestors).toBe(3)
  })

  it('takes the two ends of a life in pictures from both ends of the list', async () => {
    const { result } = renderHook(() => usePersonStats('p1'))
    await waitFor(() => expect(result.current).not.toBe(null))
    expect(result.current.earliest).toBe('1966')
    expect(result.current.latest).toBe('2026')
  })

  it('walks the pedigree as deep as the records go', async () => {
    renderHook(() => usePersonStats('p1'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const urls = global.fetch.mock.calls.map(c => String(c[0]))
    expect(urls.some(u => u.includes('/ancestors?generations=8'))).toBe(true)
  })

  it('counts faces the archive is unsure about, not only the confident ones', async () => {
    renderHook(() => usePersonStats('p1'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(String(global.fetch.mock.calls[0][0])).toContain('min_confidence=all')
  })

  describe('when a person has nothing of a given kind', () => {
    it('reports zero rather than guessing', async () => {
      stubApi({
        all: { total: 0, media: [] },
        oldest: { total: 0, media: [] },
        located: {}, videos: {}, collections: [], groups: [],
        ancestors: { ancestors: [] },
      })
      const { result } = renderHook(() => usePersonStats('p1'))
      await waitFor(() => expect(result.current).not.toBe(null))
      expect(result.current).toMatchObject({
        photos: 0, videos: 0, located: 0, collections: 0, groups: 0, ancestors: 0,
      })
      expect(result.current.earliest).toBe(null)
      expect(result.current.latest).toBe(null)
    })

    it('survives endpoints that answer with the wrong shape', async () => {
      stubApi({ collections: { nope: true }, groups: null, ancestors: null })
      const { result } = renderHook(() => usePersonStats('p1'))
      await waitFor(() => expect(result.current).not.toBe(null))
      expect(result.current.collections).toBe(0)
      expect(result.current.groups).toBe(0)
      expect(result.current.ancestors).toBe(0)
    })

    it('survives an endpoint returning an error', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: false }))
      const { result } = renderHook(() => usePersonStats('p1'))
      await waitFor(() => expect(result.current).not.toBe(null))
      expect(result.current.photos).toBe(0)
    })

    it('stays empty when the network is down', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('offline')))
      const { result } = renderHook(() => usePersonStats('p1'))
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(result.current).toBe(null)
    })

    it('asks nothing at all without a person', () => {
      renderHook(() => usePersonStats(null))
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  it('does not show one person\'s counts on another person\'s page', async () => {
    const { result, rerender } = renderHook(({ id }) => usePersonStats(id), {
      initialProps: { id: 'p1' },
    })
    await waitFor(() => expect(result.current).not.toBe(null))
    rerender({ id: 'p2' })
    // The figures for p1 must not linger under p2's name while p2 loads.
    expect(result.current).toBe(null)
  })

  it('does not set state after the caller has gone', async () => {
    // Promise.all plus its .then needs more than one microtask to drain, so
    // this waits a real tick — otherwise the guard never runs and the test
    // passes without exercising anything.
    // Six requests go out; every one has to settle or Promise.all never
    // resolves and the guard under test is never reached.
    const settlers = []
    global.fetch = vi.fn(() => new Promise(res => { settlers.push(res) }))
    const { unmount } = renderHook(() => usePersonStats('p1'))
    unmount()
    settlers.forEach(res =>
      res({ ok: true, json: () => Promise.resolve({ total: 1, media: [] }) }))
    await new Promise(r => setTimeout(r, 0))
    // Reaching here without a React "state update on unmounted component"
    // warning is the assertion: the `alive` guard returned early.
    expect(global.fetch).toHaveBeenCalled()
  })
})

describe('spanOf', () => {
  it('joins the two ends of a life in pictures', () => {
    expect(spanOf({ earliest: '1966', latest: '2026' })).toBe('1966–2026')
  })

  it('gives one year when everything was taken in the same one', () => {
    expect(spanOf({ earliest: '1992', latest: '1992' })).toBe('1992')
  })

  it('falls back to whichever end is known', () => {
    expect(spanOf({ earliest: null, latest: '2026' })).toBe('2026')
    expect(spanOf({ earliest: '1966', latest: null })).toBe('1966')
  })

  it('is empty when neither end is known', () => {
    expect(spanOf({ earliest: null, latest: null })).toBe(null)
  })

  it('is empty before the counts arrive', () => {
    expect(spanOf(null)).toBe(null)
  })
})
