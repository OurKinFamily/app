import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useGroup, findPlaces, shortPlace } from '../../../src/lib/useGroup'

const GROUP = {
  id: 'g1', name: 'Holy Angels 1978', type: 'school_class', year: 1978,
  members: [{ id: 'p1', name: 'Margaret Young', role: 'Student' }],
}

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

beforeEach(() => { global.fetch = vi.fn(() => ok(GROUP)) })

const load = async () => {
  const view = renderHook(() => useGroup('g1'))
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

const callsTo = (fragment, method) => global.fetch.mock.calls
  .filter(([url, init]) => String(url).includes(fragment) && (!method || init?.method === method))

describe('useGroup', () => {
  describe('opening one', () => {
    it('reads the circle and everyone in it', async () => {
      const { result } = await load()
      expect(result.current.group).toEqual(GROUP)
      expect(result.current.missing).toBe(false)
    })

    it('says plainly when there is no such circle', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }))
      const { result } = await load()
      expect(result.current.missing).toBe(true)
      expect(result.current.group).toBeNull()
    })
  })

  describe('adding people', () => {
    it('adds several at once, sharing a role', async () => {
      const { result } = await load()
      await act(async () => {
        await result.current.addMembers([{ id: 'p2' }, { id: 'p3' }], 'Student')
      })
      const posts = callsTo('/members', 'POST')
      expect(posts).toHaveLength(2)
      expect(JSON.parse(posts[0][1].body)).toEqual({ person_id: 'p2', role: 'Student' })
    })

    // A class photograph is fourteen names in one sitting; doing them one at a
    // time makes it a chore nobody finishes.
    it('sends no role rather than an empty one', async () => {
      const { result } = await load()
      await act(async () => { await result.current.addMembers([{ id: 'p2' }], '') })
      expect(JSON.parse(callsTo('/members', 'POST')[0][1].body).role).toBeNull()
    })

    // The graph decides what a role looks like once stored; guessing locally
    // is how a list starts disagreeing with the thing it is showing.
    it('reads the circle back rather than patching it locally', async () => {
      const { result } = await load()
      const before = callsTo('/api/groups/g1').filter(([, i]) => !i).length
      await act(async () => { await result.current.addMembers([{ id: 'p2' }], 'Student') })
      const after = callsTo('/api/groups/g1').filter(([, i]) => !i).length
      expect(after).toBeGreaterThan(before)
    })
  })

  describe('taking somebody out', () => {
    it('removes just them, then reads the circle back', async () => {
      const { result } = await load()
      await act(async () => { await result.current.removeMember('p1') })
      expect(callsTo('/members/p1', 'DELETE')).toHaveLength(1)
    })
  })

  describe('editing it', () => {
    it('sends the year as a number the graph can sort on', async () => {
      const { result } = await load()
      await act(async () => {
        await result.current.save({ name: 'x', type: 'school', year: '1978' })
      })
      expect(JSON.parse(callsTo('/api/groups/g1', 'PATCH')[0][1].body).year).toBe(1978)
    })

    it('sends nothing rather than empty strings for what was left blank', async () => {
      const { result } = await load()
      await act(async () => {
        await result.current.save({ name: 'x', type: 'school', year: '', season: '', notes: '' })
      })
      expect(JSON.parse(callsTo('/api/groups/g1', 'PATCH')[0][1].body)).toMatchObject({
        year: null, season: null, notes: null, location_name: null,
        latitude: null, longitude: null,
      })
    })

    // The name alone would do for reading, but the coordinates are what let a
    // circle appear on the map beside the photographs taken there.
    it('keeps the coordinates with the place name', async () => {
      const { result } = await load()
      await act(async () => {
        await result.current.save({
          name: 'x', type: 'school',
          location: { name: 'Perkiomen Valley', lat: 40.2, lng: -75.5 },
        })
      })
      expect(JSON.parse(callsTo('/api/groups/g1', 'PATCH')[0][1].body)).toMatchObject({
        location_name: 'Perkiomen Valley', latitude: 40.2, longitude: -75.5,
      })
    })

    it('shows the change without waiting for another read', async () => {
      global.fetch = vi.fn((url, init) => (
        init?.method === 'PATCH' ? ok({ ...GROUP, name: 'Renamed' }) : ok(GROUP)
      ))
      const { result } = await load()
      await act(async () => { await result.current.save({ name: 'Renamed', type: 'school' }) })
      expect(result.current.group.name).toBe('Renamed')
      // The members are still there — a PATCH answer is merged, not swapped in.
      expect(result.current.group.members).toHaveLength(1)
    })
  })

  describe('deleting it', () => {
    it('asks the server to remove the circle', async () => {
      const { result } = await load()
      await act(async () => { await result.current.remove() })
      expect(callsTo('/api/groups/g1', 'DELETE')).toHaveLength(1)
    })
  })

  describe('reloading', () => {
    it('reads the circle again on request', async () => {
      const { result } = await load()
      const before = callsTo('/api/groups/g1').length
      await act(async () => { await result.current.reload() })
      expect(callsTo('/api/groups/g1').length).toBeGreaterThan(before)
    })
  })
})

describe('shortPlace', () => {
  // Nominatim answers with the whole postal address — street, county,
  // postcode, country. A circle is "Perkiomen Valley, Pennsylvania".
  it('keeps the place and its region, not the postcode', () => {
    expect(shortPlace({
      display_name: 'Perkiomen Valley, Montgomery County, Pennsylvania, 19473, United States',
    })).toBe('Perkiomen Valley, Montgomery County')
  })

  it('copes with a name that is already short', () => {
    expect(shortPlace({ display_name: 'Epping' })).toBe('Epping')
  })
})

describe('findPlaces', () => {
  it('asks OpenStreetMap in English', async () => {
    global.fetch = vi.fn(() => ok([{ place_id: 1 }]))
    const results = await findPlaces('Perkiomen Valley')
    expect(results).toEqual([{ place_id: 1 }])
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toContain('Perkiomen%20Valley')
    expect(init.headers['Accept-Language']).toBe('en')
  })

  it('returns nothing rather than throwing when the service is unhappy', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 429 }))
    expect(await findPlaces('anywhere')).toEqual([])
  })
})
