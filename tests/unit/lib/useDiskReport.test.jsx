import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useDiskReport, READINESS, TONES } from '../../../src/lib/useDiskReport'

// Archive and heritage are the systems of record. Staging is a workspace, and
// its un-indexed files are backlog rather than drift — counting them made a
// healthy archive read as permanently broken.
const REPORT = {
  generated: '2026-09-19T10:00:00',
  duration_seconds: 42.5,
  photos_root: '/photos',
  directories: {
    archive: {
      media_total: 1000, graph_total: 990, media_bytes: 5_000_000_000,
      by_year: { 1987: 10, 2026: 40, '0000': 7 },
      by_extension: { jpg: 900, mov: 100 },
      by_kind: { image: 900, video: 100 },
    },
    heritage: {
      media_total: 200, graph_total: 200, media_bytes: 1_000_000_000,
      by_extension: { jpg: 150, tif: 50 },
      by_kind: { image: 200 },
    },
    staging: { media_total: 12_739, graph_total: 3, media_bytes: 2_000_000 },
  },
  drift: {
    on_disk_not_in_graph: { by_root: { archive: 33, heritage: 90, staging: 12_739 } },
    in_graph_not_on_disk: { by_root: { archive: 4, heritage: 0 } },
  },
}

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

beforeEach(() => { global.fetch = vi.fn(() => ok(REPORT)) })

const load = async () => {
  const view = renderHook(() => useDiskReport())
  await waitFor(() => expect(view.result.current.summary).toBeTruthy())
  return view
}

describe('useDiskReport', () => {
  describe('counting what is accounted for', () => {
    it('counts only the systems of record, not the workspace', async () => {
      const { result } = await load()
      // 1000 + 200, with staging's 12,739 left out.
      expect(result.current.summary.onDisk).toBe(1200)
      expect(result.current.summary.inGraph).toBe(1190)
    })

    it('reports staging separately, and without alarm', async () => {
      const { result } = await load()
      expect(result.current.summary.staging).toEqual({ onDisk: 12_739, inGraph: 3 })
    })

    it('adds up what is unaccounted for on both sides', async () => {
      const { result } = await load()
      expect(result.current.summary.unindexed).toBe(123)  // 33 + 90
      expect(result.current.summary.stale).toBe(4)
      expect(result.current.summary.missing).toBe(127)
    })

    it('gives the matched share as a percentage', async () => {
      const { result } = await load()
      // min(1200, 1190) - 4 stale = 1186 of 1200.
      expect(result.current.summary.syncPct).toBeCloseTo(98.83, 1)
    })

    it('does not divide by zero on an empty archive', async () => {
      global.fetch = vi.fn(() => ok({ directories: {}, drift: {} }))
      const { result } = await load()
      expect(result.current.summary.syncPct).toBe(0)
    })

    // An older report, or one written mid-walk, may not carry these at all.
    it('survives a report with no directories or drift in it', async () => {
      global.fetch = vi.fn(() => ok({ generated: '2026-09-19T10:00:00' }))
      const { result } = await load()
      expect(result.current.summary).toMatchObject({
        onDisk: 0, inGraph: 0, unindexed: 0, stale: 0, totalBytes: 0, syncPct: 0,
      })
      expect(result.current.summary.years).toEqual([])
    })

    it('counts a directory that never reported its size as nothing', async () => {
      global.fetch = vi.fn(() => ok({
        directories: { archive: { media_total: 5, graph_total: 5 } },
        drift: {},
      }))
      const { result } = await load()
      expect(result.current.summary.totalBytes).toBe(0)
    })
  })

  describe('the inventory', () => {
    it('totals bytes across everything, workspace included', async () => {
      const { result } = await load()
      expect(result.current.summary.totalBytes).toBe(6_002_000_000)
    })

    it('adds extensions up across directories, commonest first', async () => {
      const { result } = await load()
      expect(result.current.summary.extensions).toEqual([
        { key: 'jpg', label: 'jpg', count: 1050 },
        { key: 'mov', label: 'mov', count: 100 },
        { key: 'tif', label: 'tif', count: 50 },
      ])
    })

    it('adds the kinds up too', async () => {
      const { result } = await load()
      expect(Object.fromEntries(result.current.summary.kinds))
        .toEqual({ image: 1100, video: 100 })
    })

    describe('the years', () => {
      it('runs oldest first', async () => {
        const { result } = await load()
        expect(result.current.summary.years.map(y => y.key)).toEqual(['1987', '2026'])
      })

      // '0000' is the bucket for files with no readable date. A real number,
      // but not a year — charted beside 1897 it made every real year a sliver.
      it('leaves out the no-date bucket', async () => {
        const { result } = await load()
        expect(result.current.summary.years.map(y => y.key)).not.toContain('0000')
      })
    })
  })

  describe('when the report will not load', () => {
    it('says so instead of showing nothing forever', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 503 }))
      const { result } = renderHook(() => useDiskReport())
      await waitFor(() => expect(result.current.error).toBeTruthy())
      expect(result.current.error).toContain('503')
      // The page keys off the report itself being absent, not a loading flag.
      expect(result.current.disk).toBeNull()
    })
  })

  describe('rescanning', () => {
    it('asks for a fresh walk, then reads the result', async () => {
      const { result } = await load()
      await act(async () => { await result.current.rescan() })

      const calls = global.fetch.mock.calls.map(c => `${c[1]?.method || 'GET'} ${c[0]}`)
      expect(calls).toContain('POST /api/admin/disk-report/refresh')
      expect(calls.filter(c => c === 'GET /api/admin/disk-report')).toHaveLength(2)
    })

    it('reports a failed rescan rather than hanging on "rescanning"', async () => {
      const { result } = await load()
      global.fetch = vi.fn(() => Promise.reject(new Error('the walk fell over')))
      await act(async () => { await result.current.rescan() })
      expect(result.current.error).toBe('the walk fell over')
      expect(result.current.rescanning).toBe(false)
    })
  })
})

describe('the readiness buckets', () => {
  it('offers an action only where one would help', () => {
    const byKey = Object.fromEntries(READINESS.map(b => [b.key, b]))
    expect(byKey.ready.cta).toBe('Ingest')
    // Nothing to go on and unreadable files cannot be ingested by any flag.
    expect(byKey.hopeless.cta).toBeNull()
    expect(byKey.unreadable.cta).toBeNull()
  })

  it('names the flag that would accept each kind', () => {
    const byKey = Object.fromEntries(READINESS.map(b => [b.key, b]))
    expect(byKey.needs_no_gps.flags).toBe('--allow-no-gps')
    expect(byKey.needs_no_date.flags).toBe('--allow-no-date')
    expect(byKey.ready.flags).toBe('')
  })

  it('has a colour for every tone it uses', () => {
    for (const bucket of READINESS) {
      expect(TONES[bucket.tone], `${bucket.key} uses an unknown tone`).toBeDefined()
    }
  })
})
