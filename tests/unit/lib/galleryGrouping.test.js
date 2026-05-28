import { describe, it, expect } from 'vitest'
import { formatDay, groupByDay, citiesFor } from '../../../src/lib/galleryGrouping'

describe('formatDay', () => {
  it('renders the day in "Weekday, Mon DD, YYYY" form', () => {
    // toLocaleDateString('en-US', …) — anchored to a known weekday so the
    // assertion stays stable across machines (locale en-US is forced).
    expect(formatDay('2026-05-27')).toBe('Wed, May 27, 2026')
  })
  it('handles month and day boundaries', () => {
    expect(formatDay('2024-01-01')).toBe('Mon, Jan 1, 2024')
    expect(formatDay('2024-12-31')).toBe('Tue, Dec 31, 2024')
  })
})

describe('groupByDay', () => {
  describe('with timestamped items', () => {
    it('buckets items into one entry per YYYY-MM-DD', () => {
      const items = [
        { path: 'a.jpg', timestamp: '2024-01-01T08:00:00Z' },
        { path: 'b.jpg', timestamp: '2024-01-01T22:00:00Z' },
        { path: 'c.jpg', timestamp: '2024-01-02T09:00:00Z' },
      ]
      const grouped = groupByDay(items)
      expect(grouped).toHaveLength(2)
      const day1 = grouped.find(g => g.day === '2024-01-01')
      const day2 = grouped.find(g => g.day === '2024-01-02')
      expect(day1.items).toHaveLength(2)
      expect(day2.items).toHaveLength(1)
    })
    it('preserves insertion order within each day bucket', () => {
      const items = [
        { path: 'first',  timestamp: '2024-01-01T08:00:00Z' },
        { path: 'second', timestamp: '2024-01-01T09:00:00Z' },
      ]
      expect(groupByDay(items)[0].items.map(i => i.path)).toEqual(['first', 'second'])
    })
  })
  describe('with missing timestamps', () => {
    it('routes items without a timestamp into an "__unknown" bucket', () => {
      const items = [
        { path: 'has-ts',     timestamp: '2024-01-01T00:00:00Z' },
        { path: 'no-ts',      timestamp: null },
        { path: 'also-no-ts' },
      ]
      const grouped = groupByDay(items)
      const unknown = grouped.find(g => g.day === '__unknown')
      expect(unknown).toBeDefined()
      expect(unknown.items.map(i => i.path)).toEqual(['no-ts', 'also-no-ts'])
    })
  })
  describe('with no items', () => {
    it('returns an empty array', () => {
      expect(groupByDay([])).toEqual([])
    })
  })
})

describe('citiesFor', () => {
  it('returns distinct city values', () => {
    const items = [
      { city: 'Lancaster' },
      { city: 'Lancaster' },
      { city: 'Newburyport' },
    ]
    expect(citiesFor(items).sort()).toEqual(['Lancaster', 'Newburyport'])
  })
  it('falls back to place_name when city is missing', () => {
    const items = [
      { place_name: 'Cottage' },
      { city: 'Lancaster', place_name: 'home' },  // city wins
    ]
    expect(citiesFor(items).sort()).toEqual(['Cottage', 'Lancaster'])
  })
  it('ignores items with no city and no place_name', () => {
    expect(citiesFor([{ path: 'nada.jpg' }])).toEqual([])
  })
  it('returns an empty array for an empty input', () => {
    expect(citiesFor([])).toEqual([])
  })
})
