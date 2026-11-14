import { describe, it, expect } from 'vitest'
import { faceTiles, tileCoverage } from '../../../src/lib/faceTiles'

/**
 * The suggestion card showed one crop per cluster and threw the rest away, so
 * a group of two clusters holding two faces each put two thumbnails above a
 * button reading "Confirm 4". You were asked to vouch for faces nobody had
 * shown you — the one thing this card exists to prevent.
 */
const cluster = (id, n, crops) => ({
  cluster_id: id,
  n_faces: n,
  samples: crops.map(c => ({ crop_url: c, photo_path: `archive/${c}.jpg` })),
})

describe('face tiles', () => {
  describe('filling the card', () => {
    it('shows every crop it has when the group is small', () => {
      const { tiles, hidden } = faceTiles(
        [cluster('a', 2, ['a1', 'a2']), cluster('b', 2, ['b1', 'b2'])], 60,
      )
      // regression(2026-11-13): GroupCard took samples[0] per cluster, so two
      // clusters of two faces rendered 2 thumbnails under "Confirm 4".
      expect(tiles.map(t => t.crop_url)).toEqual(['a1', 'b1', 'a2', 'b2'])
      expect(hidden).toBe(0)
    })

    it('gives every cluster a tile before anyone gets a second', () => {
      // Breadth first: a singleton must not be buried under a big cluster's
      // spare crops, because the singleton is the weakest evidence here.
      const { tiles } = faceTiles(
        [cluster('big', 9, ['x1', 'x2', 'x3']), cluster('one', 1, ['y1'])], 60,
      )
      expect(tiles.map(t => t.cluster_id)).toEqual(['big', 'one', 'big', 'big'])
    })

    it('keeps the old behaviour when there are more clusters than room', () => {
      const clusters = Array.from({ length: 80 }, (_, i) =>
        cluster(`c${i}`, 3, [`c${i}-1`, `c${i}-2`]))
      const { tiles, hidden } = faceTiles(clusters, 60)
      expect(tiles).toHaveLength(60)
      // One each, none doubled up — the first 60 clusters, as before.
      expect(new Set(tiles.map(t => t.cluster_id)).size).toBe(60)
      expect(hidden).toBe(100) // 80 clusters × 2 crops = 160 available
    })

    it('holds nothing back when given no budget', () => {
      const { tiles, hidden } = faceTiles(
        [cluster('a', 4, ['a1', 'a2', 'a3', 'a4'])], null,
      )
      expect(tiles).toHaveLength(4)
      expect(hidden).toBe(0)
    })

    it('carries the cluster and the photograph through on every tile', () => {
      const { tiles } = faceTiles([cluster('a', 7, ['a1', 'a2'])], 60)
      expect(tiles[1]).toEqual({
        cluster_id: 'a', n_faces: 7, crop_url: 'a2', photo_path: 'archive/a2.jpg',
      })
    })
  })

  describe('clusters with nothing to show', () => {
    it('still gives a cropless cluster its tile', () => {
      // It renders as "no crop". Ugly, and correct: those faces are about to
      // be confirmed either way, so they must be clickable.
      const { tiles, hidden } = faceTiles([cluster('a', 3, []), cluster('b', 1, ['b1'])], 60)
      expect(tiles).toEqual([
        { cluster_id: 'a', n_faces: 3, crop_url: undefined, photo_path: undefined },
        { cluster_id: 'b', n_faces: 1, crop_url: 'b1', photo_path: 'archive/b1.jpg' },
      ])
      expect(hidden).toBe(0)
    })

    it('ignores samples with no crop url', () => {
      const { tiles } = faceTiles(
        [{ cluster_id: 'a', n_faces: 2, samples: [{ crop_url: null }, { crop_url: 'a2' }] }], 60,
      )
      expect(tiles.map(t => t.crop_url)).toEqual(['a2'])
    })

    it('survives a cluster with no samples field at all', () => {
      const { tiles } = faceTiles([{ cluster_id: 'a', n_faces: 1 }], 60)
      expect(tiles).toHaveLength(1)
      expect(tiles[0].crop_url).toBeUndefined()
    })

    it('returns nothing for an empty or missing group', () => {
      expect(faceTiles([], 60)).toEqual({ tiles: [], hidden: 0 })
      expect(faceTiles(undefined, 60)).toEqual({ tiles: [], hidden: 0 })
      expect(faceTiles([null], 60).tiles).toHaveLength(1)
    })

    it('shows nothing rather than everything when the budget is zero', () => {
      expect(faceTiles([cluster('a', 1, ['a1'])], 0)).toEqual({ tiles: [], hidden: 1 })
    })
  })

  describe('owning up to what is off screen', () => {
    it('says how much of the batch is visible', () => {
      expect(tileCoverage(12, 6890)).toBe('Showing 12 of 6,890 faces')
    })

    it('says nothing when the whole batch is on screen', () => {
      expect(tileCoverage(4, 4)).toBeNull()
      expect(tileCoverage(5, 4)).toBeNull()
    })

    it('says nothing rather than guessing when the total is unknown', () => {
      expect(tileCoverage(4, undefined)).toBeNull()
      expect(tileCoverage(4, null)).toBeNull()
      expect(tileCoverage(4, 'lots')).toBeNull()
    })
  })
})
