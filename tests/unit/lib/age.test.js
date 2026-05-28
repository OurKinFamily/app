import { describe, it, expect } from 'vitest'
import { ageAt } from '../../../src/lib/age'

describe('ageAt', () => {
  describe('missing inputs', () => {
    it('returns null when birthDate is missing', () => {
      expect(ageAt(null, '2020-01-01T00:00:00Z', 'high')).toBe(null)
    })
    it('returns null when photoTs is missing', () => {
      expect(ageAt('1986-04-14', null, 'high')).toBe(null)
    })
    it('returns null when both are missing', () => {
      expect(ageAt(null, null, 'high')).toBe(null)
    })
  })

  describe('confidence gating', () => {
    it('returns null when photo confidence is "low"', () => {
      expect(ageAt('1986-04-14', '2024-01-01T00:00:00Z', 'low')).toBe(null)
    })
    it('returns null when confidence is "medium"', () => {
      expect(ageAt('1986-04-14', '2024-01-01T00:00:00Z', 'medium')).toBe(null)
    })
    it('proceeds when confidence is undefined (treats as trustable)', () => {
      // Sidecar omits confidence on synthetic dates → caller's choice;
      // we don't gate on missing confidence.
      expect(ageAt('1986-04-14', '2024-04-14T00:00:00Z', undefined)).toBe('age 38')
    })
  })

  describe('year-and-up ages', () => {
    it('returns "age 38" for an adult', () => {
      expect(ageAt('1986-04-14', '2024-04-14T00:00:00Z', 'high')).toBe('age 38')
    })
    it('returns "age 1" on first birthday', () => {
      expect(ageAt('2024-01-01', '2025-01-01T00:00:00Z', 'high')).toBe('age 1')
    })
    it('handles birthday-not-yet-reached in the photo year', () => {
      // Born April 1986, photo in March 2024 → still 37.
      expect(ageAt('1986-04-14', '2024-03-01T00:00:00Z', 'high')).toBe('age 37')
    })
    it('handles a day-of-month rollover', () => {
      // Born April 14, photo April 13 → birthday not reached, age 37.
      expect(ageAt('1986-04-14', '2024-04-13T00:00:00Z', 'high')).toBe('age 37')
    })
  })

  describe('months', () => {
    it('returns "age 8 months"', () => {
      expect(ageAt('2024-01-01', '2024-09-01T00:00:00Z', 'high')).toBe('age 8 months')
    })
    it('returns "age 1 month" (singular)', () => {
      expect(ageAt('2024-01-01', '2024-02-01T00:00:00Z', 'high')).toBe('age 1 month')
    })
  })

  describe('days', () => {
    it('returns "age 5 days"', () => {
      expect(ageAt('2024-01-01', '2024-01-06T00:00:00Z', 'high')).toBe('age 5 days')
    })
    it('returns "age 1 day" (singular)', () => {
      expect(ageAt('2024-01-01', '2024-01-02T00:00:00Z', 'high')).toBe('age 1 day')
    })
    it('returns "newborn" for same-day photos', () => {
      expect(ageAt('2024-01-01', '2024-01-01T08:00:00Z', 'high')).toBe('newborn')
    })
  })

  describe('photo before birth', () => {
    it('returns null', () => {
      expect(ageAt('2024-01-01', '2023-12-31T00:00:00Z', 'high')).toBe(null)
    })
  })

  describe('birth-date precision', () => {
    it('year-precision clamps sub-year results to "age <1"', () => {
      // Born "1942" with year precision → photo in 1942 shouldn't claim
      // a specific month/day age.
      expect(ageAt('1942-01-01', '1942-06-15T00:00:00Z', 'high', 'year')).toBe('age <1')
    })
    it('month-precision clamps sub-month results to "age <1 month"', () => {
      expect(ageAt('1986-04-01', '1986-04-10T00:00:00Z', 'high', 'month')).toBe('age <1 month')
    })
    it('day-precision allows the full days/months/years range', () => {
      expect(ageAt('2024-01-01', '2024-01-06T00:00:00Z', 'high', 'day')).toBe('age 5 days')
    })
  })

  describe('invalid dates', () => {
    it('returns null when birthDate is unparseable', () => {
      expect(ageAt('not-a-date', '2024-01-01T00:00:00Z', 'high')).toBe(null)
    })
    it('returns null when photoTs is unparseable', () => {
      expect(ageAt('1986-04-14', 'nope', 'high')).toBe(null)
    })
  })
})
