import { describe, it, expect } from 'vitest'
import { groupFaceGuesses, groupPeopleRows } from '../../../src/lib/groupFaces'

/**
 * Faces are pulled from eight sampled frames of every video, so the same
 * person recurs within one file — each a real detection with its own box and
 * crop. The overlay needs all of them; a list of who is in the video does
 * not, and showing them raw read "Cayce, Cayce" against a single clip.
 */
describe('one person across several frames', () => {
  describe('who is in it', () => {
    it('lists a person once however many frames they are in', () => {
      // regression(2026-11-13): a video with two confirmed faces of the same
      // person showed her twice in the People list.
      const rows = groupPeopleRows([
        { id: 'c', name: 'Cayce', face_index: 0 },
        { id: 'c', name: 'Cayce', face_index: 4 },
      ])
      expect(rows).toHaveLength(1)
      expect(rows[0].name).toBe('Cayce')
    })

    it('keeps every frame they appear in', () => {
      // So hovering lights up all their boxes, and taking the name off takes
      // all of them rather than the first frame only.
      const rows = groupPeopleRows([
        { id: 'c', name: 'Cayce', face_index: 0 },
        { id: 'c', name: 'Cayce', face_index: 4 },
      ])
      expect(rows[0].face_indexes).toEqual([0, 4])
    })

    it('keeps different people apart', () => {
      const rows = groupPeopleRows([
        { id: 'c', name: 'Cayce', face_index: 0 },
        { id: 'h', name: 'Henry', face_index: 1 },
        { id: 'c', name: 'Cayce', face_index: 2 },
      ])
      expect(rows.map(r => r.name)).toEqual(['Cayce', 'Henry'])
      expect(rows[0].face_indexes).toEqual([0, 2])
      expect(rows[1].face_indexes).toEqual([1])
    })

    it('keeps the order they arrived in', () => {
      const rows = groupPeopleRows([
        { id: 'h', name: 'Henry', face_index: 1 },
        { id: 'c', name: 'Cayce', face_index: 0 },
      ])
      expect(rows.map(r => r.name)).toEqual(['Henry', 'Cayce'])
    })

    it('carries the rest of the person through', () => {
      const rows = groupPeopleRows([
        { id: 'c', name: 'Cayce', known_as: 'Cay', birth_date: '1986-03-21', face_index: 0 },
      ])
      expect(rows[0].known_as).toBe('Cay')
      expect(rows[0].birth_date).toBe('1986-03-21')
    })

    it('falls back to the name when there is no id', () => {
      // People catalogued by name alone, before they had a record.
      const rows = groupPeopleRows([
        { name: 'Unknown Aunt', face_index: 0 },
        { name: 'Unknown Aunt', face_index: 1 },
      ])
      expect(rows).toHaveLength(1)
      expect(rows[0].face_indexes).toEqual([0, 1])
    })

    it('copes with a person tagged without a face at all', () => {
      // Heritage photographs name people the detector never found.
      const rows = groupPeopleRows([{ id: 'c', name: 'Cayce' }])
      expect(rows[0].face_indexes).toEqual([])
    })

    it('ignores entries with nothing to identify them by', () => {
      expect(groupPeopleRows([null, {}, { face_index: 2 }])).toEqual([])
    })

    it('copes with nothing at all', () => {
      expect(groupPeopleRows(null)).toEqual([])
      expect(groupPeopleRows([])).toEqual([])
    })
  })

  describe('what to ask about', () => {
    const guess = (idx, pid, name, score, crop) => ({
      face_index: idx,
      crop_url: crop,
      suggestion: { person_id: pid, name, score },
    })

    it('asks once per person, not once per frame', () => {
      const rows = groupFaceGuesses([
        guess(2, 'g', 'Guillaume', 0.60, '/a.jpg'),
        guess(4, 'g', 'Guillaume', 0.45, '/b.jpg'),
        guess(5, 'g', 'Guillaume', 0.58, '/c.jpg'),
      ])
      expect(rows).toHaveLength(1)
      expect(rows[0].face_indexes).toEqual([2, 4, 5])
    })

    it('shows the clearest crop of them, not the first frame', () => {
      const rows = groupFaceGuesses([
        guess(2, 'g', 'Guillaume', 0.45, '/worse.jpg'),
        guess(4, 'g', 'Guillaume', 0.60, '/better.jpg'),
      ])
      expect(rows[0].crop_url).toBe('/better.jpg')
      expect(rows[0].score).toBe(0.60)
    })

    it('keeps separate people as separate questions', () => {
      const rows = groupFaceGuesses([
        guess(0, 't', 'Tristan', 0.52),
        guess(2, 'g', 'Guillaume', 0.60),
        guess(9, 't', 'Tristan', 0.57),
      ])
      expect(rows.map(r => r.name)).toEqual(['Tristan', 'Guillaume'])
      expect(rows[0].face_indexes).toEqual([0, 9])
    })

    it('leaves out faces nobody was confident about', () => {
      const rows = groupFaceGuesses([
        { face_index: 1, crop_url: '/x.jpg' },
        { face_index: 3, suggestion: null },
        guess(2, 'g', 'Guillaume', 0.60),
      ])
      expect(rows).toHaveLength(1)
      expect(rows[0].face_indexes).toEqual([2])
    })

    it('copes with a missing score', () => {
      const rows = groupFaceGuesses([
        guess(0, 'g', 'Guillaume', undefined, '/a.jpg'),
        guess(1, 'g', 'Guillaume', 0.5, '/b.jpg'),
      ])
      expect(rows[0].crop_url).toBe('/b.jpg')
    })

    it('keeps the crop it has when a later frame has no score', () => {
      const rows = groupFaceGuesses([
        guess(0, 'g', 'Guillaume', 0.5, '/good.jpg'),
        guess(1, 'g', 'Guillaume', undefined, '/unscored.jpg'),
      ])
      expect(rows[0].crop_url).toBe('/good.jpg')
      expect(rows[0].face_indexes).toEqual([0, 1])
    })

    it('copes with nothing at all', () => {
      expect(groupFaceGuesses(null)).toEqual([])
      expect(groupFaceGuesses([])).toEqual([])
      expect(groupFaceGuesses([null])).toEqual([])
    })
  })
})
