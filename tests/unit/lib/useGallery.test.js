import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useGallery } from '../../../src/lib/useGallery'

// Helper: build a media item shaped how the real API returns them.
function m(path, timestamp) {
  return { path, timestamp, width: 1, height: 1 }
}

// Drive a sequence of API responses. Each call to fetch pops the next entry.
function queueResponses(responses) {
  let i = 0
  global.fetch = vi.fn().mockImplementation(() => {
    if (i >= responses.length) {
      return Promise.reject(new Error(`fetch called more times (${i + 1}) than queued (${responses.length})`))
    }
    const { data, ok = true } = responses[i++]
    return Promise.resolve({ ok, json: async () => data })
  })
  return global.fetch
}

describe('useGallery', () => {
  beforeEach(() => { vi.resetAllMocks() })

  describe('initial load', () => {
    it('fetches /api/gallery with default limit=48, sort=desc, and no anchor', async () => {
      const fetchMock = queueResponses([{ data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      const url = fetchMock.mock.calls[0][0]
      expect(url).toBe('/api/gallery?limit=48&sort=desc')
      expect(result.current.hasMoreNewer).toBe(false)  // no anchor → no upward direction
    })
    it('passes year_from / year_to when anchored to a year', async () => {
      const fetchMock = queueResponses([{ data: { media: [] } }])
      renderHook(() => useGallery({ anchor: { year: 1995 } }))
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      const url = fetchMock.mock.calls[0][0]
      expect(url).toContain('year_from=1995')
      expect(url).toContain('year_to=1995')
    })
    it('opens hasMoreNewer when an anchor is provided (so the user can page upward too)', async () => {
      queueResponses([{ data: { media: [m('a.jpg', '1995-06-01T00:00:00Z')] } }])
      const { result } = renderHook(() => useGallery({ anchor: { year: 1995 } }))
      await waitFor(() => expect(result.current.hasMoreNewer).toBe(true))
    })
    it('sets hasMoreOlder=true when the batch fills the page', async () => {
      const fullPage = Array.from({ length: 48 }, (_, i) => m(`p${i}.jpg`, `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`))
      queueResponses([{ data: { media: fullPage } }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(48))
      expect(result.current.hasMoreOlder).toBe(true)
    })
    it('respects an explicit has_more=false from the server even on a partial page', async () => {
      queueResponses([{ data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')], has_more: false } }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      expect(result.current.hasMoreOlder).toBe(false)
    })
    it('handles a response that has no media key', async () => {
      queueResponses([{ data: {} }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(result.current.media).toEqual([])
    })
    it('forwards `params` into the query string', async () => {
      const fetchMock = queueResponses([{ data: { media: [] } }])
      renderHook(() => useGallery({ params: { city: 'Lancaster' } }))
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(fetchMock.mock.calls[0][0]).toContain('city=Lancaster')
    })
    it('captures the API total when provided', async () => {
      queueResponses([{ data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')], total: 9999 } }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.total).toBe(9999))
    })
    it('treats a non-ok response as no media', async () => {
      queueResponses([{ data: null, ok: false }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(result.current.media).toEqual([])
      expect(result.current.loading).toBe(false)
    })
  })

  describe('removeItem', () => {
    it('drops the matching path from the rendered media list', async () => {
      queueResponses([
        { data: { media: [
          m('a.jpg', '2024-01-03T00:00:00Z'),
          m('b.jpg', '2024-01-02T00:00:00Z'),
          m('c.jpg', '2024-01-01T00:00:00Z'),
        ] } },
      ])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(3))
      await act(async () => { result.current.removeItem('b.jpg') })
      expect(result.current.media.map(x => x.path)).toEqual(['a.jpg', 'c.jpg'])
    })
    it('is a no-op when the path is not in the list', async () => {
      queueResponses([{ data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { result.current.removeItem('nope.jpg') })
      expect(result.current.media).toHaveLength(1)
    })
    it('is a no-op when called with a falsy path', async () => {
      queueResponses([{ data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { result.current.removeItem(null) })
      expect(result.current.media).toHaveLength(1)
    })
  })

  describe('loadOlder', () => {
    it('appends an older page after the initial load', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-02T00:00:00Z')] } },
        { data: { media: [m('b.jpg', '2024-01-01T00:00:00Z')] } },
      ])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder() })
      expect(result.current.media.map(x => x.path)).toEqual(['a.jpg', 'b.jpg'])
    })
    it('inserts 12 gap placeholders when skipMs > 0', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-02T00:00:00Z')] } },
        { data: { media: [m('b.jpg', '2020-01-01T00:00:00Z')] } },
      ])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder(1000 * 60 * 60 * 24 * 365) })
      const gaps = result.current.media.filter(x => x.__gap)
      expect(gaps).toHaveLength(12)
      expect(gaps.every(g => g.gapToTs === '2024-01-02T00:00:00Z')).toBe(true)
    })
    it('dedupes returned items against the existing set by path', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-02T00:00:00Z'), m('b.jpg', '2024-01-01T00:00:00Z')] } },
        // Cursor overlap — `b.jpg` already present, plus a new `c.jpg`.
        { data: { media: [m('b.jpg', '2024-01-01T00:00:00Z'), m('c.jpg', '2023-12-31T00:00:00Z')] } },
      ])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(2))
      await act(async () => { await result.current.loadOlder() })
      const paths = result.current.media.map(x => x.path)
      // regression(2026-05-27): cursor overlap once duplicated items into the
      // grid; the dedup-by-path keeps each path appearing exactly once.
      expect(paths).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
    })
    it('is a no-op when there is no oldest cursor yet', async () => {
      queueResponses([{ data: { media: [] } }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      const before = global.fetch.mock.calls.length
      await act(async () => { await result.current.loadOlder() })
      expect(global.fetch.mock.calls.length).toBe(before)
    })
    it('swallows fetch rejections during loadOlder (catch branch)', async () => {
      queueResponses([{ data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      global.fetch = vi.fn().mockRejectedValue(new Error('net'))
      await act(async () => { await result.current.loadOlder() })
      expect(result.current.media).toHaveLength(1)
    })
    it('handles loadNewer response with missing media field', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } },
        { data: {} },  // no media key
      ])
      const { result } = renderHook(() => useGallery({ anchor: { year: 2024 } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadNewer() })
      expect(result.current.media).toHaveLength(1)
    })
    it('handles loadOlder response with no media key', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } },
        { data: {} },
      ])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder() })
      expect(result.current.media).toHaveLength(1)
    })
    it('flips hasMoreOlder to false when the next batch is empty', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-02T00:00:00Z')] } },
        { data: { media: [] } },
      ])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder() })
      expect(result.current.hasMoreOlder).toBe(false)
    })
  })

  describe('undated mode (offset pagination)', () => {
    // regression(2026-06-11): undated media all have timestamp===null, so the
    // timestamp-cursor loadOlder bailed on `!oldestRef.current` and only the
    // first 48 items ever loaded (which happened to be all yearbook pages).
    // Undated mode must paginate by offset instead.
    function nul(path) { return { path, timestamp: null, width: 1, height: 1 } }

    it('paginates by offset (not timestamp cursor) and appends the next page', async () => {
      const fetchMock = queueResponses([
        { data: { media: [nul('y1.jpg')], total: 5 } },
        // 2nd page defensively echoes y1 (dup) + a fresh y2 — dedupe keeps y2.
        { data: { media: [nul('y1.jpg'), nul('y2.jpg')], total: 5 } },
      ])
      const { result } = renderHook(() => useGallery({ params: { undated: true } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder() })
      expect(result.current.media.map(x => x.path)).toEqual(['y1.jpg', 'y2.jpg'])
      const url = fetchMock.mock.calls[1][0]
      expect(url).toContain('undated=true')
      expect(url).toContain('offset=1')
      expect(result.current.hasMoreOlder).toBe(true)  // offset now 3 < total 5
    })

    it('flips hasMoreOlder false once offset reaches total (empty trailing page)', async () => {
      queueResponses([
        { data: { media: [nul('y1.jpg')], total: 1 } },
        { data: { media: [], total: 1 } },  // nothing left
      ])
      const { result } = renderHook(() => useGallery({ params: { undated: true } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder() })
      expect(result.current.hasMoreOlder).toBe(false)
    })

    it('falls back to batch-length heuristic when the server omits total', async () => {
      queueResponses([
        { data: { media: [nul('y1.jpg')] } },          // no total
        { data: { media: [nul('y2.jpg')] } },          // no total, short page
      ])
      const { result } = renderHook(() => useGallery({ params: { undated: true } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder() })
      // short page (< LIMIT) with no total → no more.
      expect(result.current.hasMoreOlder).toBe(false)
    })

    it('handles an undated page response with no media key', async () => {
      queueResponses([
        { data: { media: [nul('y1.jpg')], total: 5 } },
        { data: {} },  // no media key → `|| []` fallback, no append, no throw
      ])
      const { result } = renderHook(() => useGallery({ params: { undated: true } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder() })
      expect(result.current.media).toHaveLength(1)
    })

    it('swallows fetch rejections during undated loadOlder', async () => {
      queueResponses([{ data: { media: [nul('y1.jpg')], total: 5 } }])
      const { result } = renderHook(() => useGallery({ params: { undated: true } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      global.fetch = vi.fn().mockRejectedValue(new Error('net'))
      await act(async () => { await result.current.loadOlder() })
      expect(result.current.media).toHaveLength(1)
    })

    it('is a no-op when a load is already in flight', async () => {
      queueResponses([{ data: { media: [nul('y1.jpg')], total: 5 } }])
      const { result } = renderHook(() => useGallery({ params: { undated: true } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
      const before = global.fetch.mock.calls.length
      const p1 = result.current.loadOlder()
      const p2 = result.current.loadOlder()
      await Promise.resolve()
      expect(global.fetch.mock.calls.length).toBe(before + 1)
      void p1; void p2
    })
  })

  describe('loadNewer', () => {
    it('prepends newer items in reverse (ASC → DESC) order', async () => {
      queueResponses([
        { data: { media: [m('old.jpg', '2024-01-01T00:00:00Z')] } },
        // Server returns ASC for a forward window; hook flips to DESC.
        { data: { media: [m('mid.jpg', '2024-01-02T00:00:00Z'), m('new.jpg', '2024-01-03T00:00:00Z')] } },
      ])
      const { result } = renderHook(() => useGallery({ anchor: { year: 2024 } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadNewer() })
      expect(result.current.media.map(x => x.path)).toEqual(['new.jpg', 'mid.jpg', 'old.jpg'])
    })
    it('filters out the boundary item the server echoes back', async () => {
      queueResponses([
        { data: { media: [m('boundary.jpg', '2024-01-01T00:00:00Z')] } },
        // Boundary item echoed by the cursor query; should be skipped.
        { data: { media: [m('boundary.jpg', '2024-01-01T00:00:00Z'), m('newer.jpg', '2024-01-02T00:00:00Z')] } },
      ])
      const { result } = renderHook(() => useGallery({ anchor: { year: 2024 } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadNewer() })
      expect(result.current.media.map(x => x.path)).toEqual(['newer.jpg', 'boundary.jpg'])
    })
    it('dedupes already-loaded paths so prepending cannot duplicate them', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-02T00:00:00Z')] } },
        // Forward window echoes `a.jpg` plus a real newer one.
        { data: { media: [m('a.jpg', '2024-01-02T00:00:00Z'), m('b.jpg', '2024-01-03T00:00:00Z')] } },
      ])
      const { result } = renderHook(() => useGallery({ anchor: { year: 2024 } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadNewer() })
      // regression(2026-05-27): a forward-window query that includes the
      // anchor item must not duplicate it on prepend.
      expect(result.current.media.map(x => x.path)).toEqual(['b.jpg', 'a.jpg'])
    })
    it('is a no-op when a load is already in flight (loadingRef guard)', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } },
      ])
      const { result } = renderHook(() => useGallery({ anchor: { year: 2024 } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      // Replace fetch with a never-resolving one so loadingRef stays true.
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
      const before = global.fetch.mock.calls.length
      const p1 = result.current.loadNewer()
      const p2 = result.current.loadNewer()
      await Promise.resolve()
      // Only one fetch fired — second call hit `if (loadingRef.current) return`.
      expect(global.fetch.mock.calls.length).toBe(before + 1)
      void p1; void p2
    })
    it('swallows fetch rejections during loadNewer (catch branch)', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } },
      ])
      const { result } = renderHook(() => useGallery({ anchor: { year: 2024 } }))
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      global.fetch = vi.fn().mockRejectedValue(new Error('net'))
      await act(async () => { await result.current.loadNewer() })
      // Suite continues — no throw.
      expect(result.current.media).toHaveLength(1)
    })
    it('flips hasMoreNewer to false when the forward batch is empty', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } },
        { data: { media: [] } },
      ])
      const { result } = renderHook(() => useGallery({ anchor: { year: 2024 } }))
      await waitFor(() => expect(result.current.hasMoreNewer).toBe(true))
      await act(async () => { await result.current.loadNewer() })
      expect(result.current.hasMoreNewer).toBe(false)
    })
  })

  describe('fillGap', () => {
    it('replaces matching __gap items with the fetched batch, re-sorted DESC', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-02T00:00:00Z')] } },
        // loadOlder fetches an older item, inserts gap placeholders.
        { data: { media: [m('b.jpg', '2020-06-01T00:00:00Z')] } },
        // fillGap fetches the items inside the gap range.
        { data: { media: [m('g1.jpg', '2023-01-01T00:00:00Z'), m('g2.jpg', '2022-01-01T00:00:00Z')] } },
      ])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder(1000 * 60 * 60 * 24 * 365 * 3) })
      // gaps tagged with from = b.jpg's ts, to = a.jpg's ts
      const gap = result.current.media.find(x => x.__gap)
      await act(async () => { await result.current.fillGap({ from: gap.gapFromTs, to: gap.gapToTs }) })
      const paths = result.current.media.filter(x => !x.__gap).map(x => x.path)
      expect(paths).toContain('g1.jpg')
      expect(paths).toContain('g2.jpg')
      // DESC ordering by timestamp.
      const tsList = result.current.media.filter(x => !x.__gap).map(x => x.timestamp)
      expect([...tsList]).toEqual([...tsList].sort().reverse())
    })
    it('dedupes by path within fillGap merged output (gap items always allowed)', async () => {
      // Initial load + loadOlder w/ skip → produces gap placeholders. fillGap
      // then receives a batch whose paths include duplicates and an item with
      // no path (treated like a gap entry).
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-02T00:00:00Z')] } },
        { data: { media: [m('b.jpg', '2020-01-01T00:00:00Z')] } },
        { data: { media: [m('a.jpg', '2023-01-01T00:00:00Z'), { path: '', timestamp: '2022-01-01T00:00:00Z' }] } },
      ])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder(1000 * 60 * 60 * 24 * 365 * 3) })
      const gap = result.current.media.find(x => x.__gap)
      await act(async () => { await result.current.fillGap({ from: gap.gapFromTs, to: gap.gapToTs }) })
      // a.jpg dedupes to first occurrence; pathless item kept (gap-like).
      const paths = result.current.media.filter(x => !x.__gap).map(x => x.path)
      expect(paths.filter(p => p === 'a.jpg').length).toBe(1)
    })
    it('sorts mixed timestamped + timeless items in fillGap output', async () => {
      // Multiple timeless items in the merged set → sort comparator pairs
      // them with timestamped items both ways, covering both sides of the
      // `b.timestamp ? ... : 0` ternary.
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-02T00:00:00Z')] } },
        { data: { media: [m('b.jpg', '2020-01-01T00:00:00Z')] } },
        { data: { media: [
          m('g1.jpg', '2023-06-01T00:00:00Z'),
          { path: 'g2.jpg', width: 1, height: 1 },  // no timestamp
          m('g3.jpg', '2022-06-01T00:00:00Z'),
          { path: 'g4.jpg', width: 1, height: 1 },  // no timestamp
        ] } },
      ])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder(1000 * 60 * 60 * 24 * 365 * 3) })
      const gap = result.current.media.find(x => x.__gap)
      await act(async () => { await result.current.fillGap({ from: gap.gapFromTs, to: gap.gapToTs }) })
      const real = result.current.media.filter(x => !x.__gap).map(x => x.path)
      expect(real).toContain('g1.jpg')
      expect(real).toContain('g2.jpg')
    })
    it('treats items with missing timestamp as ts=0 in the merge sort', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-02T00:00:00Z')] } },
        { data: { media: [m('b.jpg', '2020-01-01T00:00:00Z')] } },
        // Fill-gap batch with one timestamped + one timeless item.
        { data: { media: [
          m('g1.jpg', '2023-01-01T00:00:00Z'),
          { path: 'g2.jpg', width: 1, height: 1 },  // no timestamp → ts=0
        ] } },
      ])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.loadOlder(1000 * 60 * 60 * 24 * 365 * 3) })
      const gap = result.current.media.find(x => x.__gap)
      await act(async () => { await result.current.fillGap({ from: gap.gapFromTs, to: gap.gapToTs }) })
      // No throw — timestamp ternary's null branch fired.
      const realMedia = result.current.media.filter(x => !x.__gap)
      expect(realMedia.length).toBeGreaterThan(0)
    })
    it('swallows fetch rejections during fillGap (catch branch)', async () => {
      queueResponses([{ data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      global.fetch = vi.fn().mockRejectedValue(new Error('net'))
      await act(async () => { await result.current.fillGap({ from: 'x', to: 'y' }) })
      // No throw + state unchanged.
      expect(result.current.media).toHaveLength(1)
    })
    it('handles fillGap response with missing media field (|| [] fallback)', async () => {
      queueResponses([
        { data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } },
        { data: {} },  // no media key
      ])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      await act(async () => { await result.current.fillGap({ from: 'x', to: 'y' }) })
      expect(result.current.media).toHaveLength(1)
    })
    it('is a no-op when the same gap is already in flight', async () => {
      queueResponses([{ data: { media: [m('a.jpg', '2024-01-01T00:00:00Z')] } }])
      const { result } = renderHook(() => useGallery())
      await waitFor(() => expect(result.current.media).toHaveLength(1))
      // Inflight tracking is per-`from|to` key — issuing two parallel calls
      // for the same range should produce exactly one fetch (after the
      // initial). Replace fetch with one that never resolves so we can
      // verify call count, then let the second call no-op early.
      let calls = 0
      global.fetch = vi.fn().mockImplementation(() => { calls++; return new Promise(() => {}) })
      const p1 = result.current.fillGap({ from: 'x', to: 'y' })
      const p2 = result.current.fillGap({ from: 'x', to: 'y' })
      await Promise.resolve()  // let microtasks run
      expect(calls).toBe(1)
      // Avoid unhandled promise warnings.
      void p1; void p2
    })
  })
})
