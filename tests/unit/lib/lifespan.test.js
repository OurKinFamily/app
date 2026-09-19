import { describe, it, expect } from 'vitest'
import { lifespan, personSubtitle } from '../../../src/lib/lifespan'

describe('lifespan', () => {
  describe('when both years are known', () => {
    it('gives the span', () => {
      expect(lifespan({ birth_date: '1932-05-02', death_date: '2001-11-30' }))
        .toBe('1932 – 2001')
    })
  })

  describe('when only the birth is known', () => {
    it('gives the year they were born', () => {
      expect(lifespan({ birth_date: '1932-05-02' })).toBe('b. 1932')
    })

    it('says the same whether or not they are living', () => {
      // The archive does not claim a death year it does not have. An absent
      // death date means unknown, not dead.
      expect(lifespan({ birth_date: '1932', is_living: false })).toBe('b. 1932')
      expect(lifespan({ birth_date: '1932', is_living: true })).toBe('b. 1932')
    })
  })

  describe('when only the death is known', () => {
    it('gives the year they died', () => {
      expect(lifespan({ death_date: '2001-11-30' })).toBe('d. 2001')
    })
  })

  describe('when no dates are known', () => {
    it('returns null rather than an empty dash', () => {
      expect(lifespan({})).toBeNull()
    })

    it('ignores a value too short to hold a year', () => {
      expect(lifespan({ birth_date: '19' })).toBeNull()
    })
  })
})

describe('personSubtitle', () => {
  describe('when they go by something other than their name', () => {
    it('shows the full name under the nickname', () => {
      expect(personSubtitle({ name: 'Margaret Young', known_as: 'Grandma Young' }))
        .toBe('Margaret Young')
    })

    it('falls back to the years when the nickname IS the name', () => {
      expect(personSubtitle({
        name: 'Margaret Young', known_as: 'Margaret Young', birth_date: '1932',
      })).toBe('b. 1932')
    })
  })

  describe('when they have one name', () => {
    it('shows their years instead', () => {
      expect(personSubtitle({ name: 'Margaret Young', birth_date: '1932', death_date: '2001' }))
        .toBe('1932 – 2001')
    })
  })
})
