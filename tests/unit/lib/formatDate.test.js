import { describe, it, expect } from 'vitest'
import { formatDate } from '../../../src/lib/formatDate'

describe('formatDate', () => {
  describe('with nothing to show', () => {
    it.each([[null], [undefined], ['']])('returns null for %s', (value) => {
      expect(formatDate(value)).toBeNull()
    })
  })

  describe('when the date is only known to the year', () => {
    it('prints the year alone', () => {
      expect(formatDate('1887-01-01', 'year')).toBe('1887')
    })

    it('does not invent a day the archive never knew', () => {
      // The guessed-year case: "January 1, 1887" would read as a birthday
      // somebody could put in a card.
      expect(formatDate('1887-01-01', 'year')).not.toContain('January')
    })
  })

  describe('when the date is known to the day', () => {
    it('writes it out in full', () => {
      expect(formatDate('1951-04-01')).toBe('April 1, 1951')
    })

    // The bug this guards: a date-only ISO string parses as UTC, and every
    // timezone west of Greenwich then renders the day before. A birthday on
    // the wrong day is the kind of thing a family spots immediately.
    it('keeps the calendar date west of Greenwich', () => {
      expect(formatDate('1951-04-01')).toBe('April 1, 1951')
      expect(formatDate('2026-01-01')).toBe('January 1, 2026')
      expect(formatDate('1999-12-31')).toBe('December 31, 1999')
    })

    it('accepts a full timestamp as well as a bare date', () => {
      expect(formatDate('1951-04-01T13:45:00')).toBe('April 1, 1951')
    })
  })
})
