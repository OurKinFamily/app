import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useScrapbook, collectionCount, matches } from '../../../src/lib/useScrapbook'

const COLLECTIONS = [{ id: 'col1', title: 'Journals' }]
const LOOSE = [{ id: 'i1', thumb_url: '/t/1.jpg' }]
const DETAIL = { id: 'col1', title: 'Journals' }
const PAGES = [{ id: 'p1', thumb_url: '/t/p1.jpg' }]

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

function server(over = {}) {
  const data = { collections: COLLECTIONS, loose: LOOSE, detail: DETAIL, pages: PAGES, ...over }
  global.fetch = vi.fn(url => {
    const s = String(url)
    if (s.includes('/collections/') && s.endsWith('/items')) return ok({ items: data.pages })
    if (s.includes('/collections/')) return ok(data.detail)
    if (s.endsWith('/collections')) return ok(data.collections)
    if (s.endsWith('/items')) return ok({ items: data.loose })
    return ok({})
  })
  return data
}

beforeEach(() => { server() })

const load = async (collectionId) => {
  const view = renderHook(() => useScrapbook('p1', collectionId))
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

describe('collectionCount', () => {
  describe('a collection holding pages', () => {
    it('counts them as pages when it is a series', () => {
      expect(collectionCount({ item_count: 40, is_series: true })).toBe('40 pages')
    })

    it('counts them as items otherwise', () => {
      expect(collectionCount({ item_count: 7 })).toBe('7 items')
    })
  })

  // A parent holding only sub-collections would otherwise read "0 items",
  // which is both wrong and discouraging — the things are there, one level
  // down.
  describe('a collection holding other collections', () => {
    it('counts what is inside, and what those hold', () => {
      expect(collectionCount({ child_count: 3, descendant_item_count: 120, is_series: true }))
        .toBe('3 inside · 120 pages')
    })

    it('counts both when it holds pages of its own as well', () => {
      expect(collectionCount({ child_count: 2, item_count: 5 })).toBe('2 inside · 5 items')
    })

    it('calls them pages in a series that also holds sub-collections', () => {
      expect(collectionCount({ child_count: 2, item_count: 5, is_series: true }))
        .toBe('2 inside · 5 pages')
    })

    it('falls back to its own count when nothing says how deep it goes', () => {
      expect(collectionCount({ child_count: 2, item_count: 0 })).toBe('2 inside · 0 items')
    })
  })

  it('says nothing is in an empty one rather than leaving a blank', () => {
    expect(collectionCount({})).toBe('0 items')
  })
})

describe('matches', () => {
  // Searching a card finds what the card shows, not just its title.
  it('looks across everything on the card', () => {
    expect(matches(['Journals', '1974', 'Salisbury'], 'salis')).toBe(true)
  })

  it('ignores case either way', () => {
    expect(matches(['JOURNALS'], 'journals')).toBe(true)
  })

  it('says no when nothing on the card matches', () => {
    expect(matches(['Journals'], 'letters')).toBe(false)
  })

  it('shows everything when nothing has been typed', () => {
    expect(matches(['Journals'], '')).toBe(true)
    expect(matches(['Journals'], undefined)).toBe(true)
  })

  it('steps over the parts a card has none of', () => {
    expect(matches(['Journals', null, undefined], 'journals')).toBe(true)
  })
})

describe('useScrapbook', () => {
  describe('somebody’s scrapbook', () => {
    it('reads their collections and their loose pages', async () => {
      const { result } = await load()
      expect(result.current.collections).toEqual(COLLECTIONS)
      expect(result.current.loose).toHaveLength(1)
    })

    // Heritage items say thumb_url; everything else in v2 says thumbnail_url.
    it('renames the thumbnail so the tiles can show it', async () => {
      const { result } = await load()
      expect(result.current.loose[0].thumbnail_url).toBe('/t/1.jpg')
    })

    it('shows an empty scrapbook rather than failing', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }))
      const { result } = await load()
      expect(result.current.collections).toEqual([])
      expect(result.current.loose).toEqual([])
    })

    it('copes with an answer that is not a list at all', async () => {
      server({ collections: { detail: 'nope' } })
      const { result } = await load()
      expect(result.current.collections).toEqual([])
    })
  })

  describe('opening one', () => {
    it('reads the collection and its pages', async () => {
      const { result } = await load('col1')
      await waitFor(() => expect(result.current.openItems).toBeTruthy())
      expect(result.current.openDetail).toEqual(DETAIL)
      expect(result.current.openItems[0].thumbnail_url).toBe('/t/p1.jpg')
    })

    it('says it is still opening until the pages arrive', async () => {
      const { result } = renderHook(() => useScrapbook('p1', 'col1'))
      expect(result.current.openLoading).toBe(true)
      await waitFor(() => expect(result.current.openLoading).toBe(false))
    })

    it('has nothing open when no collection is chosen', async () => {
      const { result } = await load()
      expect(result.current.openDetail).toBeNull()
      expect(result.current.openLoading).toBe(false)
    })

    // The mistake this guards: leaving a collection used to leave its pages
    // behind under the next one, showing one person another's family.
    it('never leaves the last collection’s pages under the next', async () => {
      const data = server()
      const { result, rerender } = renderHook(
        ({ id }) => useScrapbook('p1', id),
        { initialProps: { id: 'col1' } },
      )
      await waitFor(() => expect(result.current.openItems).toHaveLength(1))

      data.detail = { id: 'col2', title: 'Letters' }
      data.pages = [{ id: 'q1', thumb_url: '/t/q1.jpg' }, { id: 'q2', thumb_url: '/t/q2.jpg' }]
      rerender({ id: 'col2' })
      expect(result.current.openItems).toBeNull()

      await waitFor(() => expect(result.current.openItems).toHaveLength(2))
      expect(result.current.openDetail.title).toBe('Letters')
    })

    it('copes with a collection whose answer carries no pages', async () => {
      global.fetch = vi.fn(url => {
        const str = String(url)
        if (str.includes('/collections/') && str.endsWith('/items')) return ok({})
        if (str.includes('/collections/')) return ok(DETAIL)
        return ok([])
      })
      const { result } = await load('col1')
      await waitFor(() => expect(result.current.openItems).toEqual([]))
    })

    it('copes with a collection that will not open', async () => {
      global.fetch = vi.fn(url => (
        String(url).includes('/collections/')
          ? Promise.resolve({ ok: false, status: 500 })
          : ok([])
      ))
      const { result } = await load('col1')
      await waitFor(() => expect(result.current.openLoading).toBe(false))
      expect(result.current.openDetail).toBeNull()
    })
  })
})
