import { describe, it, expect } from 'vitest'
import { FACT_FIELDS, hasFacts } from '../../../src/lib/personFacts'

/**
 * `hasFacts` decides whether the details block on the Biography tab is drawn
 * at all. Getting it wrong in one direction prints a heading over nothing;
 * in the other it hides somebody's only recorded fact.
 */
describe('hasFacts', () => {
  it('is false for a person with nothing recorded', () => {
    expect(hasFacts({ id: 'p1', name: 'Nobody' })).toBe(false)
  })

  it('is false when there is no person at all', () => {
    expect(hasFacts(null)).toBe(false)
    expect(hasFacts(undefined)).toBe(false)
  })

  it('is true when they went by another name', () => {
    expect(hasFacts({ former_names: ['Patty', 'Pat'] })).toBe(true)
  })

  it('is false for an empty list of former names', () => {
    expect(hasFacts({ former_names: [] })).toBe(false)
  })

  it('is true when somebody has written notes', () => {
    expect(hasFacts({ notes: 'Born in Haverhill.' })).toBe(true)
  })

  it('is false for notes that were saved empty', () => {
    expect(hasFacts({ notes: '' })).toBe(false)
  })

  describe('each life-event field on its own', () => {
    for (const [key, label] of FACT_FIELDS) {
      it(`is true for ${label}`, () => {
        expect(hasFacts({ [key]: '1998-04-02' })).toBe(true)
      })
    }
  })
})

describe('FACT_FIELDS', () => {
  it('uses the family-facing wording, not the database column', () => {
    const labels = FACT_FIELDS.map(([, label]) => label)
    expect(labels).toContain('Passed')
    expect(labels).toContain('Last home')
    expect(labels).toContain('Laid to rest')
    expect(labels).not.toContain('Died')
    expect(labels).not.toContain('Place of death')
  })

  it('marks the two dates that are only ever known to the year', () => {
    const byKey = Object.fromEntries(FACT_FIELDS.map(([k, , d]) => [k, d]))
    expect(byKey.immigration_date).toBe('year')
    expect(byKey.naturalization_date).toBe('year')
  })
})
