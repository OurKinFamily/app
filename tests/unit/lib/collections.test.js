import { describe, it, expect } from 'vitest'
import { Baby, Clapperboard, Building2, Pencil, Newspaper, FileText, Mail, Folder } from 'lucide-react'
import { categoryLabel, categoryIcon, collectionCount } from '../../../src/lib/collections'

describe('categoryLabel', () => {
  it.each([
    ['baby_book',       'Baby Book'],
    ['home_movies',     'Home Movies'],
    ['medical_records', 'Medical Records'],
    ['school_papers',   'School Papers'],
    ['newspaper',       'Newspaper'],
    ['documents',       'Documents'],
    ['letters',         'Letters'],
  ])('maps %s → %s', (key, label) => {
    expect(categoryLabel(key)).toBe(label)
  })
  it('falls back to the raw key when no mapping exists', () => {
    expect(categoryLabel('mystery_box')).toBe('mystery_box')
  })
})

describe('categoryIcon', () => {
  it.each([
    ['baby_book',       Baby],
    ['home_movies',     Clapperboard],
    ['medical_records', Building2],
    ['school_papers',   Pencil],
    ['newspaper',       Newspaper],
    ['documents',       FileText],
    ['letters',         Mail],
  ])('returns the icon component for %s', (key, Icon) => {
    expect(categoryIcon(key)).toBe(Icon)
  })
  it('falls back to the generic Folder icon for unknown categories', () => {
    expect(categoryIcon('mystery_box')).toBe(Folder)
  })
})

describe('collectionCount', () => {
  describe('series collections', () => {
    it('renders the count as "<n> pages"', () => {
      expect(collectionCount({ item_count: 42, is_series: true })).toBe('42 pages')
    })
    it('treats a missing item_count as 0 pages', () => {
      expect(collectionCount({ is_series: true })).toBe('0 pages')
    })
  })

  describe('loose collections', () => {
    it('renders the count as "<n> items"', () => {
      expect(collectionCount({ item_count: 7, is_series: false })).toBe('7 items')
    })
    it('defaults to loose ("items") when is_series is unset', () => {
      expect(collectionCount({ item_count: 7 })).toBe('7 items')
    })
    it('treats a missing item_count as 0 items', () => {
      expect(collectionCount({})).toBe('0 items')
    })
  })
})
