import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFamilyOutline } from '../../../src/lib/useFamilyOutline'

// Ahnentafel: the subject is 1, a father is 2n and a mother is 2n+1, so the
// whole pedigree is one flat list that nests itself.
const ANCESTORS = [
  { slot: 2, id: 'f', name: 'Father' },
  { slot: 3, id: 'm', name: 'Mother' },
  { slot: 4, id: 'ff', name: "Father's father" },
  { slot: 7, id: 'mm', name: "Mother's mother" },
]

const PERSON = { id: 'p1', name: 'Margaret Young' }
const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

function server({ ancestors = ANCESTORS, childrenOf = {} } = {}) {
  global.fetch = vi.fn(url => {
    const str = String(url)
    if (str.includes('/ancestors')) return ok({ ancestors })
    const match = str.match(/\/api\/people\/([^/]+)\/relatives/)
    if (match) return ok({ children: childrenOf[match[1]] || [] })
    return ok({})
  })
}

beforeEach(() => { server() })

const load = async (relatives = {}) => {
  const view = renderHook(() => useFamilyOutline(PERSON, relatives))
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

describe('useFamilyOutline', () => {
  describe('going back', () => {
    it('finds the parents of the person themselves', async () => {
      const { result } = await load()
      expect(result.current.parentsOf({ slot: 1 }).map(p => p.id)).toEqual(['f', 'm'])
    })

    it('treats no slot at all as the subject', async () => {
      const { result } = await load()
      expect(result.current.parentsOf().map(p => p.id)).toEqual(['f', 'm'])
    })

    it('finds the parents of anybody further back', async () => {
      const { result } = await load()
      // The father sits at slot 2, so his own parents are 4 and 5.
      expect(result.current.parentsOf({ slot: 2 }).map(p => p.id)).toEqual(['ff'])
      // The mother is 3, so hers are 6 and 7 — only 7 is recorded.
      expect(result.current.parentsOf({ slot: 3 }).map(p => p.id)).toEqual(['mm'])
    })

    it('has nothing to show where the records stop', async () => {
      const { result } = await load()
      expect(result.current.parentsOf({ slot: 4 })).toEqual([])
    })

    // Only the subject's own parents can be unlinked from this page; removing
    // a great-grandparent is somebody else's relationship.
    it('offers to unlink only the subject’s own parents', async () => {
      const { result } = await load()
      expect(result.current.parentsOf({ slot: 1 })[0].removableAs).toBe('parent')
      expect(result.current.parentsOf({ slot: 2 })[0].removableAs).toBeNull()
    })

    it('copes when nobody before them is recorded', async () => {
      server({ ancestors: [] })
      const { result } = await load()
      expect(result.current.parentsOf({ slot: 1 })).toEqual([])
    })

    it('copes with an answer that carries no pedigree at all', async () => {
      global.fetch = vi.fn(() => ok({}))
      const { result } = await load()
      expect(result.current.parentsOf({ slot: 1 })).toEqual([])
    })

    it('copes when the pedigree cannot be read', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }))
      const { result } = await load()
      expect(result.current.parentsOf({ slot: 1 })).toEqual([])
    })
  })

  describe('alongside', () => {
    it('keeps spouses and siblings apart', async () => {
      const { result } = await load({
        spouses: [{ id: 's1', name: 'Spouse' }],
        siblings: [{ id: 'b1', name: 'Brother' }],
      })
      expect(result.current.spouses.map(p => p.id)).toEqual(['s1'])
      expect(result.current.siblings.map(p => p.id)).toEqual(['b1'])
    })

    it('offers to unlink a spouse', async () => {
      const { result } = await load({ spouses: [{ id: 's1' }] })
      expect(result.current.spouses[0].removableAs).toBe('spouse')
    })

    it('has empty lists rather than nothing when none are recorded', async () => {
      const { result } = await load()
      expect(result.current.spouses).toEqual([])
      expect(result.current.siblings).toEqual([])
      expect(result.current.children).toEqual([])
    })
  })

  describe('going forward', () => {
    it('lists the children, each unlinkable', async () => {
      const { result } = await load({ children: [{ id: 'c1' }, { id: 'c2' }] })
      expect(result.current.children.map(c => c.removableAs)).toEqual(['child', 'child'])
    })

    it('gathers the grandchildren from each child', async () => {
      server({ childrenOf: { c1: [{ id: 'g1' }], c2: [{ id: 'g2' }] } })
      const { result } = await load({ children: [{ id: 'c1' }, { id: 'c2' }] })
      await waitFor(() => expect(result.current.grandchildren).toHaveLength(2))
      expect(result.current.grandchildren.map(g => g.id).sort()).toEqual(['g1', 'g2'])
    })

    // Two of somebody's children can share a child.
    it('counts a shared grandchild once', async () => {
      server({ childrenOf: { c1: [{ id: 'shared' }], c2: [{ id: 'shared' }] } })
      const { result } = await load({ children: [{ id: 'c1' }, { id: 'c2' }] })
      await waitFor(() => expect(result.current.grandchildren).toHaveLength(1))
    })

    // The bug this replaced: opening somebody childless left the PREVIOUS
    // person's grandchildren on the page, which reads as a claim about a
    // family. Diane was shown eight who were really the last person's.
    it('shows nobody else’s grandchildren', async () => {
      server({ childrenOf: { c1: [{ id: 'g1' }] } })
      const { result, rerender } = renderHook(
        ({ person, relatives }) => useFamilyOutline(person, relatives),
        { initialProps: { person: PERSON, relatives: { children: [{ id: 'c1' }] } } },
      )
      await waitFor(() => expect(result.current.grandchildren).toHaveLength(1))

      rerender({ person: { id: 'p2', name: 'Diane' }, relatives: { children: [] } })
      expect(result.current.grandchildren).toEqual([])
    })

    it('copes with a child whose own answer carries no children', async () => {
      global.fetch = vi.fn(url => (
        String(url).includes('/ancestors') ? ok({ ancestors: [] }) : ok({})
      ))
      const { result } = await load({ children: [{ id: 'c1' }] })
      await waitFor(() => expect(result.current.grandchildren).toEqual([]))
    })

    it('ignores a child the server answered nothing for', async () => {
      global.fetch = vi.fn(url => (
        String(url).includes('/ancestors')
          ? ok({ ancestors: [] })
          : Promise.reject(new Error('gone'))
      ))
      const { result } = await load({ children: [{ id: 'c1' }] })
      await waitFor(() => expect(result.current.grandchildren).toEqual([]))
    })
  })
})
