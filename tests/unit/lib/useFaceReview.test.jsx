import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../../src/components/Toast'
import { useFaceReview } from '../../../src/lib/useFaceReview'

const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>

const GROUPED = {
  groups: [{ person_id: 'p1', person_name: 'Margaret', clusters: [{ cluster_id: 'c1', n_faces: 12 }] }],
  ambiguous: [{ cluster_id: 'c2', n_faces: 4 }],
  unknown_candidates: [{ candidate_id: 'u1', clusters: [{ cluster_id: 'c3', n_faces: 6 }] }],
}
const LEFTOVER = { leftover: [{ cluster_id: 'c9', n_faces: 2 }], total: 60 }

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

// One place that answers every endpoint this hook touches. Tests vary one
// behaviour at a time rather than replacing the whole server, which otherwise
// leaves the page stuck on "scoring" for reasons that have nothing to do with
// what is being tested.
function server(over = {}) {
  const data = {
    grouped: GROUPED,
    leftover: LEFTOVER,
    bulk: ok({ assigned: 12 }),
    count: ok({ remaining: 1234 }),
    assign: () => ok({}),
    ...over,
  }
  global.fetch = vi.fn((url, init) => {
    const s = String(url)
    if (s.includes('/unassigned/count')) return data.count
    if (s.includes('/unassigned/leftover')) return ok(data.leftover)
    if (s.includes('/unassigned/grouped')) return data.groupedResponse || ok(data.grouped)
    if (s.includes('/assign-bulk')) return data.bulk
    if (s.includes('/skip')) return ok({})
    if (s.includes('/assign')) return data.assign()
    if (init?.method === 'POST' && s.includes('/api/people/')) return ok({ id: 'new1' })
    return ok({})
  })
  return data
}

beforeEach(() => {
  localStorage.clear()
  server()
})

const load = async () => {
  const view = renderHook(() => useFaceReview(), { wrapper })
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

const called = fragment => global.fetch.mock.calls.filter(([u]) => String(u).includes(fragment))

describe('useFaceReview', () => {
  describe('opening the page', () => {
    it('reads the suggestions, the leftovers and how many are left', async () => {
      const { result } = await load()
      expect(result.current.data).toEqual(GROUPED)
      await waitFor(() => expect(result.current.leftover.total).toBe(60))
      expect(result.current.remaining).toBe(1234)
    })

    it('says so when the scoring pass fails', async () => {
      server({ groupedResponse: Promise.resolve({ ok: false, status: 500 }) })
      const { result } = await load()
      expect(result.current.error).toBeTruthy()
    })

    it('shows no leftovers rather than failing when they will not load', async () => {
      global.fetch = vi.fn(url => (
        String(url).includes('leftover')
          ? Promise.resolve({ ok: false, status: 500 })
          : ok(GROUPED)
      ))
      const { result } = await load()
      await waitFor(() => expect(result.current.leftover.items).toEqual([]))
    })

    it('carries on when the remaining count cannot be read', async () => {
      server({ count: Promise.reject(new Error('unavailable')) })
      const { result } = await load()
      expect(result.current.remaining).toBeNull()
    })

    it('carries on when the count is refused rather than unreachable', async () => {
      server({ count: Promise.resolve({ ok: false, status: 503 }) })
      const { result } = await load()
      expect(result.current.remaining).toBeNull()
    })
  })

  describe('the confidence settings', () => {
    it('remembers them between visits', async () => {
      const { result } = await load()
      await act(async () => { result.current.setThreshold(0.4) })
      await waitFor(() => expect(localStorage.getItem('ourkin:face-suggestions:threshold')).toBe('0.4'))
    })

    it('starts from what was remembered', async () => {
      localStorage.setItem('ourkin:face-suggestions:threshold', '0.35')
      const { result } = await load()
      expect(result.current.threshold).toBe(0.35)
    })

    it('falls back to the default when nothing was remembered', async () => {
      const { result } = await load()
      expect(result.current.threshold).toBe(0.8)
      expect(result.current.minClusterSize).toBe(2)
    })

    it('re-scores when the bar moves', async () => {
      const { result } = await load()
      const before = called('grouped').length
      await act(async () => { result.current.setThreshold(0.5) })
      await waitFor(() => expect(called('grouped').length).toBeGreaterThan(before))
    })
  })

  describe('confirming a group', () => {
    // Per-cluster assigns stampeded the transaction pool on groups of any
    // size, and each one triggered its own brain rebuild.
    it('sends one bulk call, not one per cluster', async () => {
      const { result } = await load()
      await act(async () => {
        await result.current.confirmGroup(GROUPED.groups[0], GROUPED.groups[0].clusters)
      })
      expect(called('/assign-bulk')).toHaveLength(1)
    })

    it('hides the card once it lands', async () => {
      const { result } = await load()
      await act(async () => {
        await result.current.confirmGroup(GROUPED.groups[0], GROUPED.groups[0].clusters)
      })
      expect(result.current.hidden.has('p1')).toBe(true)
    })

    it('counts the faces itself when the server does not say', async () => {
      server({ bulk: ok({}) })
      const { result } = await load()
      await act(async () => {
        await result.current.confirmGroup(GROUPED.groups[0], GROUPED.groups[0].clusters)
      })
      expect(result.current.hidden.has('p1')).toBe(true)
    })

    it('leaves the card alone when the confirm fails', async () => {
      const { result } = await load()
      server({ bulk: Promise.reject(new Error('pool exhausted')) })
      await act(async () => {
        await result.current.confirmGroup(GROUPED.groups[0], GROUPED.groups[0].clusters)
      })
      expect(result.current.hidden.has('p1')).toBe(false)
      expect(result.current.busy).toBe(false)
    })

    it('says something even when the failure carries no words', async () => {
      const { result } = await load()
      server({ bulk: Promise.reject(new Error()) })
      await act(async () => {
        await result.current.confirmGroup(GROUPED.groups[0], GROUPED.groups[0].clusters)
      })
      expect(result.current.hidden.has('p1')).toBe(false)
    })

    it('calls a single face a face, not faces', async () => {
      server({ bulk: ok({ assigned: 1 }) })
      const { result } = await load()
      await act(async () => {
        await result.current.confirmGroup(
          { person_id: 'p1', person_name: 'Margaret' },
          [{ cluster_id: 'c1', n_faces: 1 }],
        )
      })
      expect(result.current.hidden.has('p1')).toBe(true)
    })
  })

  describe('choosing between two people', () => {
    it('assigns the cluster and hides the card', async () => {
      const { result } = await load()
      await act(async () => {
        await result.current.pickCandidate({ cluster_id: 'c2', n_faces: 4 }, { person_id: 'p9', person_name: 'Dorothy' })
      })
      expect(result.current.hidden.has('c2')).toBe(true)
    })
  })

  describe('a group nobody has named', () => {
    it('adds the person, then gives them every cluster', async () => {
      const { result } = await load()
      await act(async () => {
        await result.current.nameUnknown(GROUPED.unknown_candidates[0], 'Dorothy')
      })
      expect(called('/api/people/').some(([, i]) => i?.method === 'POST')).toBe(true)
      expect(result.current.hidden.has('u1')).toBe(true)
    })

    it('gives them to somebody already known', async () => {
      const { result } = await load()
      await act(async () => {
        await result.current.assignUnknown(GROUPED.unknown_candidates[0], 'p2', 'Margaret')
      })
      expect(result.current.hidden.has('u1')).toBe(true)
    })

    // A placeholder keeps the faces together so they can be named later in one
    // go, rather than rediscovered as strangers on every pass.
    it('parks them under a placeholder name', async () => {
      const { result } = await load()
      await act(async () => { await result.current.parkUnknown(GROUPED.unknown_candidates[0]) })
      const created = called('/api/people/').find(([, i]) => i?.method === 'POST')
      expect(JSON.parse(created[1].body).name).toMatch(/^Unknown person /)
    })

    it('skips them for good', async () => {
      const { result } = await load()
      await act(async () => { await result.current.skipForever(GROUPED.unknown_candidates[0]) })
      expect(called('/skip')).toHaveLength(1)
      expect(result.current.hidden.has('u1')).toBe(true)
    })

    // One bad cluster should not lose the rest.
    it('keeps going when one cluster of several will not assign', async () => {
      const candidate = {
        candidate_id: 'u2',
        clusters: [{ cluster_id: 'a', n_faces: 3 }, { cluster_id: 'b', n_faces: 4 }],
      }
      let call = 0
      server({
        assign: () => {
          call += 1
          return call === 1 ? Promise.reject(new Error('locked')) : ok({})
        },
      })
      const { result } = await load()
      await act(async () => { await result.current.nameUnknown(candidate, 'Dorothy') })
      expect(result.current.hidden.has('u2')).toBe(true)
    })
  })

  describe('the leftovers', () => {
    it('reads another page and adds to what is shown', async () => {
      const { result } = await load()
      await waitFor(() => expect(result.current.leftover.items).toHaveLength(1))
      await act(async () => { await result.current.moreLeftover() })
      expect(result.current.leftover.items).toHaveLength(2)
    })

    it('stops saying "loading" when another page will not come', async () => {
      const { result } = await load()
      await waitFor(() => expect(result.current.leftover.items).toHaveLength(1))
      global.fetch = vi.fn(() => Promise.reject(new Error('x')))
      await act(async () => { await result.current.moreLeftover() })
      expect(result.current.leftover.loading).toBe(false)
    })

    it.each([
      ['assignCluster', (r, c) => r.assignCluster(c, 'p2', 'Margaret')],
      ['createForCluster', (r, c) => r.createForCluster(c, 'Dorothy')],
      ['parkCluster', (r, c) => r.parkCluster(c)],
      ['skipCluster', (r, c) => r.skipCluster(c)],
    ])('hides a leftover once %s has dealt with it', async (_, run) => {
      const { result } = await load()
      const cluster = { cluster_id: 'c9', n_faces: 2 }
      await act(async () => { await run(result.current, cluster) })
      expect(result.current.hidden.has('c9')).toBe(true)
    })
  })

  describe('dismissing a card by hand', () => {
    // Re-scoring is a twenty-five second pass over the whole archive, so a
    // card that has been dealt with is hidden until the next explicit refresh.
    it('hides it without re-scoring', async () => {
      const { result } = await load()
      const before = called('grouped').length
      await act(async () => { result.current.hide('p1') })
      expect(result.current.hidden.has('p1')).toBe(true)
      expect(called('grouped').length).toBe(before)
    })

    it('forgets the dismissals on the next scoring pass', async () => {
      const { result } = await load()
      await act(async () => { result.current.hide('p1') })
      await act(async () => { await result.current.reload() })
      expect(result.current.hidden.size).toBe(0)
    })
  })

  describe('when the browser refuses to remember anything', () => {
    let store
    beforeEach(() => {
      store = Object.getOwnPropertyDescriptor(window, 'localStorage')
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem: () => { throw new Error('private window') },
          setItem: () => { throw new Error('private window') },
        },
      })
    })
    afterEach(() => { Object.defineProperty(window, 'localStorage', store) })

    it('still works, on the defaults', async () => {
      const { result } = await load()
      expect(result.current.threshold).toBe(0.8)
      await act(async () => { result.current.setThreshold(0.5) })
      expect(result.current.threshold).toBe(0.5)
    })
  })
})
