import { describe, it, expect } from 'vitest'
import { kindLabel, kindBadge, albumWhen, albumSubtitle } from '../../../src/lib/albumKind'

/**
 * Albums gained a kind when 245 of them were generated from the archive's own
 * signals. The card has one line under the title to say what an album is and
 * when it was, and it has to stay readable for a Christmas in 1972 and a trip
 * last week alike.
 */
describe('album kind', () => {
  describe('the label', () => {
    it.each([
      ['holiday', 'Holiday'],
      ['trip', 'Trip'],
      ['journey', 'Journey'],
      ['birthday', 'Birthday'],
      ['big_day', 'Big day'],
      ['manual', 'Album'],
    ])('calls %s "%s"', (kind, label) => {
      expect(kindLabel(kind)).toBe(label)
    })

    it('falls back to a plain album for anything it does not know', () => {
      // Albums made before the kind existed have no kind at all.
      expect(kindLabel(undefined)).toBe('Album')
      expect(kindLabel(null)).toBe('Album')
      expect(kindLabel('nonsense')).toBe('Album')
    })
  })

  describe('the badge', () => {
    it('carries a colour so kinds are distinguishable at a glance', () => {
      const b = kindBadge('holiday')
      expect(b.label).toBe('Holiday')
      expect(b.fg).toMatch(/^#[0-9a-f]{6}$/i)
      expect(b.bg).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('gives every known kind its own background', () => {
      const bgs = ['manual', 'holiday', 'trip', 'journey', 'birthday', 'big_day']
        .map(k => kindBadge(k).bg)
      expect(new Set(bgs).size).toBe(bgs.length)
    })

    it('falls back for an unknown kind rather than returning nothing', () => {
      expect(kindBadge('nonsense').label).toBe('Album')
      expect(kindBadge(undefined).bg).toBeTruthy()
    })
  })

  describe('when it happened', () => {
    it('names the month for a single day', () => {
      expect(albumWhen('2022-07-02T10:00:00Z', '2022-07-02T18:00:00Z')).toBe('July 2022')
    })

    it('names the month once when the album sits inside one', () => {
      expect(albumWhen('1972-12-24T00:00:00Z', '1972-12-25T00:00:00Z')).toBe('December 1972')
    })

    it('spans two months in the same year', () => {
      expect(albumWhen('2015-03-09T00:00:00Z', '2015-04-02T00:00:00Z')).toBe('March–April 2015')
    })

    it('falls back to years when it crosses one', () => {
      expect(albumWhen('2017-12-31T00:00:00Z', '2018-01-01T00:00:00Z')).toBe('2017–2018')
    })

    it('copes with only one date', () => {
      expect(albumWhen('2019-05-04T00:00:00Z', null)).toBe('May 2019')
    })

    it('says nothing when the album has no dated photographs', () => {
      // Rather than printing "Invalid Date" on the card.
      expect(albumWhen(null, null)).toBeNull()
      expect(albumWhen(undefined, undefined)).toBeNull()
      expect(albumWhen('not a date', null)).toBeNull()
    })

    it('ignores an unusable end date', () => {
      expect(albumWhen('2019-05-04T00:00:00Z', 'rubbish')).toBe('May 2019')
    })
  })

  describe('the subtitle', () => {
    it('is the date alone — the kind is a badge, not part of this line', () => {
      expect(albumSubtitle({
        kind: 'holiday', first_taken: '1972-12-25T00:00:00Z', last_taken: '1972-12-25T00:00:00Z',
      })).toBe('December 1972')
    })

    it('is nothing when the album has no dated photographs', () => {
      expect(albumSubtitle({ kind: 'trip' })).toBeNull()
    })

    it('survives no album at all', () => {
      expect(albumSubtitle(undefined)).toBeNull()
    })
  })
})
