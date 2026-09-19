import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useClusterQueue } from '../../../src/lib/useClusterQueue'

const cluster = (id, size = 10) => ({ id, size, samples: [`/c/${id}.jpg`] })
const CLUSTERS = [cluster('c1'), cluster('c2'), cluster('c3')]

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

function server({ clusters = CLUSTERS, total = 3 } = {}) {
  global.fetch = vi.fn(url => {
    if (String(url).includes('/faces/clusters')) return ok({ clusters, total })
    return ok({ id: 'person-stephen', name: 'Stephen' })
  })
}

beforeEach(() => { server() })

const load = async () => {
  const view = renderHook(() => useClusterQueue())
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

describe('useClusterQueue', () => {
  describe('the queue', () => {
    it('reads the groups nobody has named', async () => {
      const { result } = await load()
      expect(result.current.clusters).toHaveLength(3)
      expect(result.current.total).toBe(3)
    })

    it('starts with nothing chosen', async () => {
      const { result } = await load()
      expect(result.current.selected).toBeNull()
    })

    // Saves typing the same five names several hundred times an evening.
    it('fetches the people most likely to be the answer', async () => {
      await load()
      const asked = global.fetch.mock.calls.map(c => String(c[0]))
      expect(asked.filter(u => u.includes('/api/people/person-')).length).toBeGreaterThan(0)
    })
  })

  describe('skipping a group', () => {
    it('takes it out and moves to the one that took its place', async () => {
      const { result } = await load()
      await act(async () => { result.current.setSelected(CLUSTERS[1]) })
      await act(async () => { result.current.remove('c2') })

      expect(result.current.clusters.map(c => c.id)).toEqual(['c1', 'c3'])
      expect(result.current.selected.id).toBe('c3')
      expect(result.current.total).toBe(2)
    })

    it('falls back to the one before when the last is skipped', async () => {
      const { result } = await load()
      await act(async () => { result.current.setSelected(CLUSTERS[2]) })
      await act(async () => { result.current.remove('c3') })
      expect(result.current.selected.id).toBe('c2')
    })

    it('leaves the choice alone when a different group is skipped', async () => {
      const { result } = await load()
      await act(async () => { result.current.setSelected(CLUSTERS[0]) })
      await act(async () => { result.current.remove('c3') })
      expect(result.current.selected.id).toBe('c1')
    })

    it('has nothing left to choose when the last one goes', async () => {
      server({ clusters: [cluster('only')], total: 1 })
      const { result } = await load()
      await act(async () => { result.current.setSelected({ id: 'only' }) })
      await act(async () => { result.current.remove('only') })
      expect(result.current.selected).toBeNull()
    })
  })

  describe('naming some of a group', () => {
    // A group of four hundred is often two people; the rest stays behind.
    it('leaves a partly-named group in place, smaller', async () => {
      const { result } = await load()
      await act(async () => { result.current.setSelected(CLUSTERS[0]) })
      await act(async () => { result.current.drain('c1', 4) })

      expect(result.current.clusters[0]).toMatchObject({ id: 'c1', size: 6 })
      expect(result.current.selected).toMatchObject({ id: 'c1', size: 6 })
    })

    it('drops a group once every face in it has a name', async () => {
      const { result } = await load()
      await act(async () => { result.current.setSelected(CLUSTERS[0]) })
      await act(async () => { result.current.drain('c1', 10) })

      expect(result.current.clusters.map(c => c.id)).toEqual(['c2', 'c3'])
      // The next group takes the empty one's place, so the work continues.
      expect(result.current.selected.id).toBe('c2')
    })

    it('never counts a group below nothing', async () => {
      const { result } = await load()
      await act(async () => { result.current.drain('c1', 999) })
      expect(result.current.clusters.map(c => c.id)).toEqual(['c2', 'c3'])
    })

    it('does nothing when no faces were named', async () => {
      const { result } = await load()
      await act(async () => { result.current.drain('c1', 0) })
      expect(result.current.clusters).toHaveLength(3)
    })
  })

  describe('when a quick-pick person cannot be read', () => {
    it('leaves them out rather than failing the page', async () => {
      global.fetch = vi.fn(url => (
        String(url).includes('/faces/clusters')
          ? ok({ clusters: CLUSTERS, total: 3 })
          : Promise.resolve({ ok: false, status: 404 })
      ))
      const { result } = await load()
      expect(result.current.quickPeople).toEqual([])
      expect(result.current.clusters).toHaveLength(3)
    })
  })

  describe('naming faces in a group nobody is looking at', () => {
    it('leaves the chosen group alone', async () => {
      const { result } = await load()
      await act(async () => { result.current.setSelected(CLUSTERS[0]) })
      await act(async () => { result.current.drain('c2', 4) })
      expect(result.current.selected).toMatchObject({ id: 'c1', size: 10 })
      expect(result.current.clusters[1]).toMatchObject({ id: 'c2', size: 6 })
    })

    it('falls back to the group before when the last one empties', async () => {
      const { result } = await load()
      await act(async () => { result.current.setSelected(CLUSTERS[2]) })
      await act(async () => { result.current.drain('c3', 10) })
      expect(result.current.selected.id).toBe('c2')
    })

    it('has nothing chosen once the only group empties', async () => {
      server({ clusters: [cluster('only')], total: 1 })
      const { result } = await load()
      await act(async () => { result.current.setSelected({ id: 'only', size: 10 }) })
      await act(async () => { result.current.drain('only', 10) })
      expect(result.current.selected).toBeNull()
    })

    it('drops an emptied group even when another is chosen', async () => {
      const { result } = await load()
      await act(async () => { result.current.setSelected(CLUSTERS[0]) })
      await act(async () => { result.current.drain('c3', 10) })
      expect(result.current.clusters.map(c => c.id)).toEqual(['c1', 'c2'])
    })
  })

  describe('reading more of the queue', () => {
    it('asks for the next page and adds to what is shown', async () => {
      server({ clusters: Array.from({ length: 50 }, (_, i) => cluster(`a${i}`)), total: 120 })
      const { result } = await load()
      expect(result.current.hasMore).toBe(true)

      await act(async () => { result.current.loadMore() })
      await waitFor(() => expect(result.current.clusters.length).toBe(100))
    })

    it('knows when it has reached the end', async () => {
      const { result } = await load()
      expect(result.current.hasMore).toBe(false)
      const before = global.fetch.mock.calls.length
      await act(async () => { result.current.loadMore() })
      expect(global.fetch.mock.calls.length).toBe(before)
    })
  })
})
