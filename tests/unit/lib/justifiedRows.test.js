import { describe, it, expect } from 'vitest'
import { computeRows } from '../../../src/lib/justifiedRows'

// Flickr-style justified layout. Pure data in/out: a list of items with
// width/height → rows whose heights are scaled so each row fills the
// container exactly.

function item(w, h) { return { width: w, height: h } }

describe('computeRows', () => {
  describe('degenerate inputs', () => {
    it('returns an empty array when there are no items', () => {
      expect(computeRows([], 1000)).toEqual([])
    })
    it('returns an empty array when containerWidth is 0', () => {
      expect(computeRows([item(800, 600)], 0)).toEqual([])
    })
    it('returns an empty array when containerWidth is undefined', () => {
      expect(computeRows([item(800, 600)])).toEqual([])
    })
  })

  describe('packing into rows', () => {
    it('puts a single small item in one last-row at the default rowHeight', () => {
      const rows = computeRows([item(800, 600)], 2000, { rowHeight: 100 })
      expect(rows).toHaveLength(1)
      expect(rows[0].height).toBe(100)
      expect(rows[0].last).toBe(true)
      expect(rows[0].items[0].aspect).toBeCloseTo(800 / 600)
    })
    it('breaks into a new row once aspect-sum × rowHeight exceeds containerWidth', () => {
      // Four 1:1 items at rowHeight=100 → each is 100px wide before scaling.
      // containerWidth=300 means the 3rd item triggers a row break.
      const rows = computeRows(
        [item(100, 100), item(100, 100), item(100, 100), item(100, 100)],
        300,
        { rowHeight: 100, gap: 0 },
      )
      expect(rows).toHaveLength(2)
      expect(rows[0].items).toHaveLength(3)
      expect(rows[0].last).toBeUndefined()
      // The leftover sits on the last row at the unscaled rowHeight.
      expect(rows[1].items).toHaveLength(1)
      expect(rows[1].last).toBe(true)
    })
  })

  describe('row-height scaling', () => {
    it('scales the height so a full row fills containerWidth exactly', () => {
      // Three 1:1 items in a 300px container with no gaps → aspectSum=3,
      // height = 300 / 3 = 100.
      const rows = computeRows(
        [item(100, 100), item(100, 100), item(100, 100)],
        300,
        { rowHeight: 100, gap: 0 },
      )
      expect(rows[0].height).toBe(100)
    })
    it('subtracts the cumulative gap from the width before scaling', () => {
      // Three 1:1 items in a 310px container with gap=5 → 2 gaps × 5 = 10px,
      // height = (310 - 10) / 3 = 100.
      const rows = computeRows(
        [item(100, 100), item(100, 100), item(100, 100)],
        310,
        { rowHeight: 100, gap: 5 },
      )
      expect(rows[0].height).toBe(100)
    })
  })

  describe('aspect ratio defaults', () => {
    it('uses the default 4:3 aspect when width/height are missing', () => {
      const rows = computeRows([{}], 1000, { rowHeight: 100 })
      expect(rows[0].items[0].aspect).toBeCloseTo(4 / 3)
    })
    it('respects an explicit defaultAspect option', () => {
      const rows = computeRows([{}], 1000, { rowHeight: 100, defaultAspect: 2 })
      expect(rows[0].items[0].aspect).toBe(2)
    })
  })
})
