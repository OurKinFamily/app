import { describe, it, expect } from 'vitest'
import { facesFrom } from '../../../src/lib/facesFrom'

const named = (over = {}) => ({ face_index: 0, bbox: [1, 2, 3, 4], name: 'Margaret Young', ...over })
const unknown = (over = {}) => ({ face_index: 1, bbox: [5, 6, 7, 8], crop_url: '/c.jpg', ...over })

describe('facesFrom', () => {
  describe('with nothing to draw', () => {
    it.each([[null], [undefined], [{}]])('returns an empty list for %s', (detail) => {
      expect(facesFrom(detail)).toEqual([])
    })
  })

  describe('with faces somebody has named', () => {
    it('carries the name through', () => {
      const [face] = facesFrom({ people: [named()] })
      expect(face.name).toBe('Margaret Young')
    })

    it('prefers what the family calls them', () => {
      const [face] = facesFrom({ people: [named({ known_as: 'Grandma Young' })] })
      expect(face.name).toBe('Grandma Young')
    })
  })

  describe('with faces nobody has named', () => {
    it('marks the name as unanswered rather than absent', () => {
      const [face] = facesFrom({ unidentified: [unknown()] })
      expect(face.name).toBeNull()
    })

    it('keeps the crop so the face can be shown while asking', () => {
      const [face] = facesFrom({ unidentified: [unknown()] })
      expect(face.crop_url).toBe('/c.jpg')
    })
  })

  describe('with both kinds', () => {
    it('returns them as one list — they are the same faces', () => {
      const faces = facesFrom({ people: [named()], unidentified: [unknown()] })
      expect(faces).toHaveLength(2)
      expect(faces.map(f => f.face_index)).toEqual([0, 1])
    })
  })

  describe('when a face has no box', () => {
    // An undefined box positions the outline in the corner of the photograph,
    // over whatever happens to be there.
    it('drops it rather than drawing it in the corner', () => {
      const faces = facesFrom({
        people: [named(), named({ face_index: 2, bbox: undefined })],
        unidentified: [unknown({ face_index: 3, bbox: null })],
      })
      expect(faces.map(f => f.face_index)).toEqual([0])
    })
  })
})
