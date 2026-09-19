import { describe, it, expect } from 'vitest'
import { SORTS } from '../../../src/lib/peopleSort'

describe('SORTS', () => {
  it('offers closest-first, by name, and oldest-first', () => {
    expect(SORTS.map(s => s.key)).toEqual(['suggested', 'name', 'born'])
  })

  // The API's own order, and the only one that answers "who is this archive
  // about" rather than "what letter does their name start with".
  it('leads with closest-first', () => {
    expect(SORTS[0]).toEqual({ key: 'suggested', label: 'Closest first' })
  })

  it('labels every option for a reader, not a database', () => {
    for (const sort of SORTS) {
      expect(sort.label).toMatch(/^[A-Z]/)
      expect(sort.label).not.toBe(sort.key)
    }
  })
})
