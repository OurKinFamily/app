import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useArchiveReport, pctOf, overallPct, pctTone, sortRows,
  DIR_FILTERS, FIELDS, ISSUES, REQUIRED,
} from '../../../src/lib/useArchiveReport'

const row = (over = {}) => ({
  path: '2019/07', total: 100,
  mpp: 100, objects: 100, clip: 100, md5: 100, perceptual: 100,
  gps: 50, geo: 40, ...over,
})

describe('pctOf', () => {
  it('gives a field as a share of the directory', () => {
    expect(pctOf(row({ objects: 25 }), 'objects')).toBe(25)
  })

  it.each([
    ['the directory is empty', row({ total: 0 })],
    ['the field was never counted', row({ objects: null })],
  ])('has no answer when %s', (_, r) => {
    expect(pctOf(r, 'objects')).toBeNull()
  })
})

describe('overallPct', () => {
  it('averages the passes that must happen', () => {
    expect(overallPct(row())).toBe(100)
  })

  // GPS is deliberately not in the average: plenty of real photographs have
  // no location and never will.
  it('ignores the ones that are allowed to be missing', () => {
    expect(REQUIRED).not.toContain('gps')
    expect(overallPct(row({ gps: 0, geo: 0 }))).toBe(100)
  })

  it('drops with whichever pass fell behind', () => {
    expect(overallPct(row({ clip: 0 }))).toBe(80)
  })

  it('has no answer for a directory with nothing in it', () => {
    expect(overallPct(row({ total: 0 }))).toBeNull()
  })
})

describe('pctTone', () => {
  // The middle band is wide on purpose: a directory at 96% is mid-pass, not
  // broken.
  it.each([
    ['done', 100],
    ['done', 99],
  ])('calls %s at %i%%', (_, pct) => {
    expect(pctTone(pct)).toBe('#137333')
  })

  it('is amber while a pass is still running', () => {
    expect(pctTone(96)).toBe('#a15c00')
    expect(pctTone(80)).toBe('#a15c00')
  })

  it('is red when something is actually wrong', () => {
    expect(pctTone(79)).toBe('#c5221f')
    expect(pctTone(0)).toBe('#c5221f')
  })

  it('is grey when there is no answer at all', () => {
    expect(pctTone(null)).toBe('#9aa0a6')
  })
})

describe('sortRows', () => {
  const rows = [{ n: 3, s: 'b' }, { n: 1, s: 'c' }, { n: 2, s: 'a' }]
  const value = (r, key) => r[key]

  it('sorts numbers up', () => {
    expect(sortRows(rows, 'n', true, value).map(r => r.n)).toEqual([1, 2, 3])
  })

  it('sorts numbers down', () => {
    expect(sortRows(rows, 'n', false, value).map(r => r.n)).toEqual([3, 2, 1])
  })

  it('sorts words alphabetically either way', () => {
    expect(sortRows(rows, 's', true, value).map(r => r.s)).toEqual(['a', 'b', 'c'])
    expect(sortRows(rows, 's', false, value).map(r => r.s)).toEqual(['c', 'b', 'a'])
  })

  it('leaves the original list alone', () => {
    const original = [...rows]
    sortRows(rows, 'n', true, value)
    expect(rows).toEqual(original)
  })

  // A directory with no answer sorts last rather than first, so an unsorted
  // hole does not head the table.
  it('puts the unanswered at the bottom', () => {
    const withGap = [{ n: null }, { n: 5 }]
    expect(sortRows(withGap, 'n', false, value).map(r => r.n)).toEqual([5, null])
  })

  it('puts the unanswered first when sorting up, where it belongs', () => {
    const withGap = [{ n: 5 }, { n: null }]
    expect(sortRows(withGap, 'n', true, value).map(r => r.n)).toEqual([null, 5])
  })

  it('handles an unanswered value on either side of the comparison', () => {
    const gaps = [{ n: null }, { n: 5 }, { n: null }, { n: 2 }]
    expect(sortRows(gaps, 'n', true, value).map(r => r.n)).toEqual([null, null, 2, 5])
    expect(sortRows(gaps, 'n', false, value).map(r => r.n)).toEqual([5, 2, null, null])
  })

  // The directory column is words and the rest are numbers, but a half-filled
  // report can hand back one of each for the same column.
  it('compares as words when either side is a word', () => {
    const mixed = [{ v: 2 }, { v: 'apple' }]
    expect(() => sortRows(mixed, 'v', true, value)).not.toThrow()
    expect(sortRows(mixed, 'v', true, value).map(r => r.v)).toEqual([2, 'apple'])
  })
})

describe('the directory filters', () => {
  it('lets everything through by default', () => {
    expect(DIR_FILTERS[0].test(row({ total: 0 }))).toBe(true)
  })

  it('finds directories where a required pass fell short', () => {
    const issues = DIR_FILTERS.find(f => f.key === 'issues')
    expect(issues.test(row())).toBe(false)
    expect(issues.test(row({ md5: 99 }))).toBe(true)
  })

  it('finds the ones nothing has looked at', () => {
    const unseen = DIR_FILTERS.find(f => f.key === 'unseen')
    expect(unseen.test(row({ objects: 0 }))).toBe(true)
    expect(unseen.test(row())).toBe(false)
  })

  it('finds the ones that are mostly unlocated', () => {
    const noGps = DIR_FILTERS.find(f => f.key === 'no_gps')
    expect(noGps.test(row({ gps: 10 }))).toBe(true)
    expect(noGps.test(row({ gps: 90 }))).toBe(false)
  })

  it('passes over empty directories rather than flagging them', () => {
    for (const filter of DIR_FILTERS.slice(1)) {
      expect(filter.test(row({ total: 0 })), filter.key).toBe(false)
    }
  })
})

describe('useArchiveReport', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true, json: () => Promise.resolve({ totals: { total: 10 } }),
    }))
  })

  it('reads the report the job last wrote', async () => {
    const { result } = renderHook(() => useArchiveReport())
    await waitFor(() => expect(result.current.report).toBeTruthy())
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/report')
    expect(result.current.loading).toBe(false)
  })

  // The report is written by a job, so the honest answer before it has ever
  // run is to say so rather than to render an empty dashboard.
  it('says to run the job when there is no report yet', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }))
    const { result } = renderHook(() => useArchiveReport())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error).toMatch(/Archive Report/)
  })
})

describe('the vocabulary', () => {
  it('names every field a reader would recognise', () => {
    for (const [, label] of FIELDS) expect(label).toMatch(/^[A-Z]/)
  })

  it('marks only the faults as serious, not the queues', () => {
    const serious = Object.fromEntries(ISSUES.map(([key, , s]) => [key, s]))
    expect(serious.corrupted).toBe(true)
    expect(serious.missing_md5).toBe(true)
    // Eight thousand files waiting for a description is a queue, and colouring
    // it like a fault trains you to ignore the colour.
    expect(serious.missing_clip).toBe(false)
    expect(serious.no_gps).toBe(false)
  })
})
