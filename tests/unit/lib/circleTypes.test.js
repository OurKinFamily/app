import { describe, it, expect } from 'vitest'
import { TYPE_LABELS, TYPE_ROLES, typeLabel, describeGroup } from '../../../src/lib/circleTypes'

describe('typeLabel', () => {
  it('writes a stored type the way a person would say it', () => {
    expect(typeLabel('school_class')).toBe('School Class')
    expect(typeLabel('family_friend')).toBe('Family Friend')
  })

  // Types already attached to real groups in the graph. An unknown one is
  // shown as-is rather than hidden: a raw key on screen is a prompt to add a
  // label, where a blank is just a gap nobody chases.
  it('shows an unrecognised type rather than nothing', () => {
    expect(typeLabel('bowling_league')).toBe('bowling_league')
  })
})

describe('describeGroup', () => {
  describe('when everything is known', () => {
    it('reads as kind, year, place', () => {
      expect(describeGroup({ type: 'school_class', year: 1978, location_name: 'Perkiomen Valley' }))
        .toBe('School Class · 1978 · Perkiomen Valley')
    })
  })

  describe('when only some of it is known', () => {
    it('leaves out what is missing, without stray separators', () => {
      expect(describeGroup({ type: 'workplace' })).toBe('Workplace')
      expect(describeGroup({ type: 'camp', year: 1991 })).toBe('Camp · 1991')
      expect(describeGroup({ type: 'civic', location_name: 'Salisbury' }))
        .toBe('Civic · Salisbury')
    })
  })
})

describe('the vocabulary', () => {
  it('offers roles for every kind of circle', () => {
    for (const type of Object.keys(TYPE_LABELS)) {
      expect(TYPE_ROLES[type], `${type} has no roles`).toBeDefined()
      expect(TYPE_ROLES[type].length).toBeGreaterThan(0)
    }
  })

  // A free-text role becomes twelve spellings of "member" within a year.
  it('names no role twice within a circle', () => {
    for (const [type, roles] of Object.entries(TYPE_ROLES)) {
      expect(new Set(roles).size, `${type} repeats a role`).toBe(roles.length)
    }
  })
})
