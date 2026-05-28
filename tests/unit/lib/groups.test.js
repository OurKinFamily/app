import { describe, it, expect } from 'vitest'
import { typeLabel, groupMeta } from '../../../src/lib/groups'

describe('typeLabel', () => {
  it.each([
    ['sports_team',      'Sports Team'],
    ['fitness',          'Fitness'],
    ['hobby_club',       'Hobby / Club'],
    ['school_class',     'School Class'],
    ['school',           'School'],
    ['extracurricular',  'Extracurricular'],
    ['workplace',        'Workplace'],
    ['professional_org', 'Professional Org'],
    ['neighborhood',     'Neighborhood'],
    ['religious',        'Religious'],
    ['civic',            'Civic'],
    ['family_friend',    'Family Friend'],
    ['extended_network', 'Extended Network'],
    ['camp',             'Camp'],
  ])('maps %s → %s', (key, label) => {
    expect(typeLabel(key)).toBe(label)
  })
  it('falls back to the raw key when no mapping exists', () => {
    expect(typeLabel('mystery_type')).toBe('mystery_type')
  })
})

describe('groupMeta', () => {
  describe('when location_name is present', () => {
    it('joins the type label and location with " · "', () => {
      expect(groupMeta({ type: 'sports_team', location_name: 'Timberlane' }))
        .toBe('Sports Team · Timberlane')
    })
  })
  describe('when location_name is missing', () => {
    it('returns only the type label', () => {
      expect(groupMeta({ type: 'sports_team' })).toBe('Sports Team')
    })
    it('also drops an empty location string', () => {
      expect(groupMeta({ type: 'school', location_name: '' })).toBe('School')
    })
  })
  describe('with an unknown type', () => {
    it('falls back to the raw type and still appends location', () => {
      expect(groupMeta({ type: 'mystery_type', location_name: 'Somewhere' }))
        .toBe('mystery_type · Somewhere')
    })
  })
})
