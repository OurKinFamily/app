import { describe, it, expect } from 'vitest'
import { DEFAULT_SORT, SORTS, sortPeople } from '../../../src/lib/peopleSort'

const p = (name, extra = {}) => ({ name, ...extra })

describe('SORTS', () => {
  it('offers most-photographs, closest-first, by name, and oldest-first', () => {
    expect(SORTS.map(s => s.key)).toEqual(['photos', 'suggested', 'name', 'born'])
  })

  it('opens on most photographs', () => {
    // The people the archive is actually about are the ones it holds the most
    // pictures of, and that beats any ordering by name for finding somebody.
    expect(DEFAULT_SORT).toBe('photos')
    expect(SORTS[0]).toEqual({ key: 'photos', label: 'Most photographs' })
  })

  it('labels every option for a reader, not a database', () => {
    for (const sort of SORTS) {
      expect(sort.label).toMatch(/^[A-Z]/)
      expect(sort.label).not.toBe(sort.key)
    }
  })
})

describe('sortPeople', () => {
  it('leaves the caller’s array alone', () => {
    const rows = [p('Beth'), p('Alan')]
    sortPeople(rows, 'name')
    expect(rows.map(r => r.name)).toEqual(['Beth', 'Alan'])
  })

  it('copes with holes and records that have no name', () => {
    // Nothing in the list is guaranteed: a record can arrive mid-creation,
    // and a crash while sorting takes the whole page with it.
    for (const key of ['photos', 'suggested', 'name', 'born']) {
      const out = sortPeople([null, {}, p('Alan', { photo_count: 2 })], key)
      expect(out).toHaveLength(3)
      expect(out.some(r => r?.name === 'Alan')).toBe(true)
    }
  })

  it('uses a one-word name as its own surname when nothing else is there', () => {
    expect(sortPeople([{ name: '' }, p('Alan Young')], 'name').map(r => r.name))
      .toEqual(['', 'Alan Young'])
  })

  it('copes with nothing to sort', () => {
    expect(sortPeople(null, 'photos')).toEqual([])
    expect(sortPeople(undefined, 'name')).toEqual([])
  })

  describe('by most photographs', () => {
    const rows = [
      p('Alan', { photo_count: 3 }),
      p('Beth', { photo_count: 900 }),
      p('Carl', { photo_count: 40 }),
    ]

    it('puts the most photographed first', () => {
      expect(sortPeople(rows, 'photos').map(r => r.name)).toEqual(['Beth', 'Carl', 'Alan'])
    })

    it('treats somebody with no count as having none', () => {
      const out = sortPeople([p('Zoe'), p('Alan', { photo_count: 1 })], 'photos')
      expect(out.map(r => r.name)).toEqual(['Alan', 'Zoe'])
    })

    it('falls back to the name on a tie', () => {
      const out = sortPeople(
        [p('Carl', { photo_count: 5 }), p('Alan', { photo_count: 5 })], 'photos')
      expect(out.map(r => r.name)).toEqual(['Alan', 'Carl'])
    })

    it('uses what somebody is called on a tie, not their full name', () => {
      const out = sortPeople([
        p('Zachary Young', { known_as: 'Al', photo_count: 2 }),
        p('Adam Young', { known_as: 'Zeb', photo_count: 2 }),
      ], 'photos')
      expect(out.map(r => r.known_as)).toEqual(['Al', 'Zeb'])
    })
  })

  describe('placeholders', () => {
    // The family list used to open on three blank "Unknown person" records,
    // which is a poor first impression of an archive about actual people.
    const rows = [
      p('Unknown person 2026-06-03 03:20', { photo_count: 5000 }),
      p('Alan', { photo_count: 1 }),
    ]

    it('sink below real people however many photographs they have', () => {
      expect(sortPeople(rows, 'photos')[0].name).toBe('Alan')
    })

    it('sink in every other ordering too', () => {
      for (const key of ['suggested', 'name', 'born']) {
        expect(sortPeople(rows, key)[0].name).toBe('Alan')
      }
    })
  })

  describe('closest first', () => {
    it('keeps the order the API gave, which already ranks by closeness', () => {
      const rows = [p('Zoe'), p('Alan'), p('Mary')]
      expect(sortPeople(rows, 'suggested').map(r => r.name)).toEqual(['Zoe', 'Alan', 'Mary'])
    })
  })

  describe('by name', () => {
    it('sorts on the surname', () => {
      const rows = [p('Alan Zeller'), p('Zoe Abbott')]
      expect(sortPeople(rows, 'name').map(r => r.name)).toEqual(['Zoe Abbott', 'Alan Zeller'])
    })

    it('treats a single word as its own surname', () => {
      const rows = [p('Zara'), p('Alan Young')]
      expect(sortPeople(rows, 'name').map(r => r.name)).toEqual(['Alan Young', 'Zara'])
    })
  })

  describe('oldest first', () => {
    it('sorts by birth date', () => {
      const rows = [p('Young', { birth_date: '1986-03-21' }), p('Old', { birth_date: '1921-01-02' })]
      expect(sortPeople(rows, 'born').map(r => r.name)).toEqual(['Old', 'Young'])
    })

    it('puts people with no birth date after everybody who has one', () => {
      // An empty string would otherwise sort to the very top.
      const rows = [p('Nobody knows'), p('Old', { birth_date: '1921-01-02' })]
      expect(sortPeople(rows, 'born').map(r => r.name)).toEqual(['Old', 'Nobody knows'])
    })

    it('falls back to the name when two share a birth date', () => {
      const rows = [
        p('Carl', { birth_date: '1950-01-01' }),
        p('Alan', { birth_date: '1950-01-01' }),
      ]
      expect(sortPeople(rows, 'born').map(r => r.name)).toEqual(['Alan', 'Carl'])
    })
  })
})
