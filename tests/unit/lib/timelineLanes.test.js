import { describe, it, expect } from 'vitest'
import { yearOf, packLanes, groupBySpan, COUNT_RATIO } from '../../../src/lib/timelineLanes'

// Helper: row shaped how /api/people/{id}/connection-timeline returns.
function row({ id, first, last, count = 1, name = id }) {
  return {
    id,
    name,
    first_ts:    `${first}-01-01T00:00:00Z`,
    last_ts:     `${last}-12-31T00:00:00Z`,
    photo_count: count,
  }
}

describe('yearOf', () => {
  it.each([
    ['2024-01-01T00:00:00Z', 2024],
    ['1991-12-31T23:59:59Z', 1991],
    [   '1986',              1986],
  ])('takes the first 4 chars and parses as a number (%s → %i)', (ts, year) => {
    expect(yearOf(ts)).toBe(year)
  })
})

describe('packLanes', () => {
  describe('when bars don\'t overlap', () => {
    it('puts non-overlapping bars in the same lane', () => {
      const rows = [row({ id: 'a', first: 2000, last: 2005 }), row({ id: 'b', first: 2010, last: 2015 })]
      const { lanes, placed } = packLanes(rows)
      expect(lanes).toHaveLength(1)
      expect(placed.map(p => p.lane)).toEqual([0, 0])
    })
  })
  describe('when bars overlap', () => {
    it('opens a new lane for each overlapping bar', () => {
      const rows = [
        row({ id: 'a', first: 2000, last: 2010 }),
        row({ id: 'b', first: 2005, last: 2015 }),
        row({ id: 'c', first: 2007, last: 2008 }),
      ]
      const { lanes } = packLanes(rows)
      expect(lanes).toHaveLength(3)
    })
  })
  describe('sort order', () => {
    it('places the longest-duration bar in lane 0', () => {
      const rows = [
        row({ id: 'short', first: 2010, last: 2011 }),
        row({ id: 'long',  first: 2000, last: 2020 }),
        row({ id: 'mid',   first: 2005, last: 2010 }),
      ]
      const { placed } = packLanes(rows)
      const lane0 = placed.find(p => p.lane === 0).row
      expect(lane0.id).toBe('long')
    })
    it('breaks ties on duration by older first_ts first', () => {
      const rows = [
        row({ id: 'newer', first: 2010, last: 2015 }),
        row({ id: 'older', first: 2000, last: 2005 }),
      ]
      const { placed } = packLanes(rows)
      // Same duration → older one assigned first → both in lane 0.
      expect(placed.find(p => p.row.id === 'older').lane).toBe(0)
      expect(placed.find(p => p.row.id === 'newer').lane).toBe(0)
    })
  })
  describe('output shape', () => {
    it('returns { row, lane, start, end } for each placed entry', () => {
      const rows = [row({ id: 'a', first: 2000, last: 2005 })]
      const { placed } = packLanes(rows)
      expect(placed[0]).toEqual({ row: rows[0], lane: 0, start: 2000, end: 2005 })
    })
  })
})

describe('groupBySpan', () => {
  describe('when rows share the same span', () => {
    it('merges them into one bar when counts are within COUNT_RATIO', () => {
      const rows = [
        row({ id: 'a', first: 2000, last: 2010, count: 100 }),
        row({ id: 'b', first: 2000, last: 2010, count: 50 }),
      ]
      const grouped = groupBySpan(rows)
      expect(grouped).toHaveLength(1)
      expect(grouped[0].people).toHaveLength(2)
      expect(grouped[0].photo_count).toBe(150)
      expect(grouped[0].id).toBe('a+b')
    })
    it('splits into separate groups when count ratio exceeds COUNT_RATIO', () => {
      const rows = [
        row({ id: 'deep',  first: 2000, last: 2010, count: 1000 }),
        row({ id: 'cameo', first: 2000, last: 2010, count: 5 }),
      ]
      const grouped = groupBySpan(rows)
      // regression(2026-05-27): cameo people were being merged with deep
      // relationships when their spans coincidentally matched; the count
      // ratio check (5 * 3 < 1000) keeps them in separate bars.
      expect(grouped).toHaveLength(2)
      expect(grouped.map(g => g.id).sort()).toEqual(['cameo', 'deep'])
    })
  })
  describe('when spans differ', () => {
    it('puts rows with different first/last years into different groups', () => {
      const rows = [
        row({ id: 'a', first: 2000, last: 2005 }),
        row({ id: 'b', first: 2003, last: 2008 }),
      ]
      expect(groupBySpan(rows)).toHaveLength(2)
    })
  })
  describe('boundary timestamps in the merged output', () => {
    it('takes the earlier first_ts when the second-in-bucket is earlier', () => {
      // After bucket sort by count desc → [a, b]. Reduce: a.first_ts (2000-03)
      // is NOT < b.first_ts (2000-01), so the reducer returns b — hitting
      // the *false* branch of `a.first_ts < b.first_ts`.
      const rows = [
        { id: 'a', first_ts: '2000-03-01T00:00:00Z', last_ts: '2010-08-15T00:00:00Z', photo_count: 100 },
        { id: 'b', first_ts: '2000-01-01T00:00:00Z', last_ts: '2010-12-31T00:00:00Z', photo_count: 80 },
      ]
      const [grouped] = groupBySpan(rows)
      expect(grouped.first_ts).toBe('2000-01-01T00:00:00Z')
      expect(grouped.last_ts).toBe('2010-12-31T00:00:00Z')
    })
    it('keeps the first row when it already holds the earliest first_ts and latest last_ts', () => {
      // Mirror case so the *true* branch fires: a.first_ts < b.first_ts AND
      // a.last_ts > b.last_ts both evaluate true, the reducer keeps `a`.
      const rows = [
        { id: 'a', first_ts: '2000-01-01T00:00:00Z', last_ts: '2010-12-31T00:00:00Z', photo_count: 100 },
        { id: 'b', first_ts: '2000-03-01T00:00:00Z', last_ts: '2010-08-15T00:00:00Z', photo_count: 80 },
      ]
      const [grouped] = groupBySpan(rows)
      expect(grouped.first_ts).toBe('2000-01-01T00:00:00Z')
      expect(grouped.last_ts).toBe('2010-12-31T00:00:00Z')
    })
  })
  describe('photo_count totals', () => {
    it('treats a missing photo_count as 0', () => {
      const rows = [
        { id: 'a', first_ts: '2000-01-01', last_ts: '2010-01-01' },
        { id: 'b', first_ts: '2000-01-01', last_ts: '2010-01-01' },
      ]
      expect(groupBySpan(rows)[0].photo_count).toBe(0)
    })
  })
})

describe('COUNT_RATIO', () => {
  it('is the documented value (3)', () => {
    // The constant is exported for callers / regression-testing the merge
    // threshold; pinning it here so a silent edit shows up.
    expect(COUNT_RATIO).toBe(3)
  })
})
