import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import {
  useSuggestions, acceptSuggestion, rejectSuggestion, askAbout, KINDS, CONNECTION_KINDS,
} from '../../../src/lib/useSuggestions'

const SUGGESTIONS = [
  { id: 's1', type: 'connection', person_id: 'p1', target_id: 'p2' },
  { id: 's2', type: 'birth_year', person_id: 'p3' },
]

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
beforeEach(() => { global.fetch = vi.fn(() => ok(SUGGESTIONS)) })

const bodyOf = fragment => {
  const call = global.fetch.mock.calls.find(([url]) => String(url).includes(fragment))
  return call ? JSON.parse(call[1].body) : null
}

describe('askAbout', () => {
  const person = { name: 'Margaret Young', known_as: 'Grandma Young' }

  it.each([
    ['connection', 'Did Grandma Young and Holy Angels know each other?'],
    ['relationship', 'Were Grandma Young and Holy Angels related?'],
    ['group_membership', 'Was Grandma Young part of Holy Angels?'],
  ])('asks about %s in words somebody can answer', (type, expected) => {
    expect(askAbout({ type, person, target: { name: 'Holy Angels' } })).toBe(expected)
  })

  it('asks about a year using the year it guessed', () => {
    expect(askAbout({ type: 'birth_year', person, metadata: { suggested_year: 1932 } }))
      .toBe('Was Grandma Young born around 1932?')
  })

  it('falls back to the reason for a kind it has no sentence for', () => {
    expect(askAbout({ type: 'something_new', reason: 'they appear together often' }))
      .toBe('they appear together often')
  })

  it('uses their name when the family has no other word for them', () => {
    expect(askAbout({
      type: 'group_membership',
      person: { name: 'Margaret Young' },
      target: { name: 'Holy Angels' },
    })).toBe('Was Margaret Young part of Holy Angels?')
  })

  it('copes when the archive does not know who it is asking about', () => {
    expect(askAbout({ type: 'connection' })).toContain('they')
  })
})

describe('the vocabulary', () => {
  it('names every kind it can ask about', () => {
    for (const kind of ['connection', 'relationship', 'group_membership', 'birth_year']) {
      expect(KINDS[kind]).toBeTruthy()
    }
  })

  it('offers ways two people might know each other', () => {
    expect(CONNECTION_KINDS).toContain('Friend')
    expect(new Set(CONNECTION_KINDS).size).toBe(CONNECTION_KINDS.length)
  })
})

describe('acceptSuggestion', () => {
  it('marks it answered whatever kind it was', async () => {
    await acceptSuggestion({ id: 's1', type: 'connection', person_id: 'p1', target_id: 'p2' })
    expect(global.fetch.mock.calls.some(([u]) => String(u).includes('/s1/accept'))).toBe(true)
  })

  it('records how two people knew each other', async () => {
    await acceptSuggestion(
      { id: 's1', type: 'connection', person_id: 'p1', target_id: 'p2' },
      { context: 'Childhood friend' },
    )
    expect(bodyOf('/connections')).toEqual({ target_id: 'p2', context: 'Childhood friend' })
  })

  it('records a relationship the reader chose', async () => {
    await acceptSuggestion(
      { id: 's1', type: 'relationship', person_id: 'p1', target_id: 'p2' },
      { relType: 'sibling' },
    )
    expect(bodyOf('/relationships')).toEqual({ rel_type: 'sibling', target_id: 'p2' })
  })

  it('puts somebody into a group', async () => {
    await acceptSuggestion({ id: 's1', type: 'group_membership', person_id: 'p1', target: { id: 'g1' } })
    expect(bodyOf('/groups/g1/members')).toEqual({ person_id: 'p1', role: null })
  })

  // A PATCH replaces the record, so the fields nobody is changing have to go
  // back as they were. Leaving them out wiped a nickname the first time.
  it('sends back the fields it is not changing', async () => {
    await acceptSuggestion({
      id: 's1', type: 'birth_year', person_id: 'p1',
      person: { name: 'Margaret Young', known_as: 'Grandma Young', is_living: false },
      metadata: { suggested_year: 1932 },
    })
    expect(bodyOf('/api/people/p1')).toEqual({
      name: 'Margaret Young', known_as: 'Grandma Young', is_living: false,
      birth_date: '1932', birth_date_precision: 'year',
    })
  })

  it('assumes living when the archive does not say otherwise', async () => {
    await acceptSuggestion({
      id: 's1', type: 'maiden_name', person_id: 'p1', person: { name: 'M' },
    }, { maidenName: 'Chooljian' })
    expect(bodyOf('/api/people/p1')).toMatchObject({ is_living: true, maiden_name: 'Chooljian' })
  })

  it('writes a place onto a group', async () => {
    await acceptSuggestion({
      id: 's1', type: 'location', target_id: 'g1', target: { name: 'Holy Angels', type: 'school' },
      metadata: { suggested_location: 'Buffalo' },
    })
    expect(bodyOf('/api/groups/g1')).toMatchObject({ location_name: 'Buffalo' })
  })

  it('writes a year onto a group', async () => {
    await acceptSuggestion({
      id: 's1', type: 'group_year', target_id: 'g1', target: { name: 'Holy Angels', type: 'school' },
      metadata: { suggested_year: 1978 },
    })
    expect(bodyOf('/api/groups/g1')).toMatchObject({ year: 1978 })
  })

  it.each(['location', 'group_year', 'birth_year'])(
    'writes nothing for %s when the guess is missing',
    async (type) => {
      await acceptSuggestion({ id: 's1', type, target_id: 'g1', person_id: 'p1', metadata: {} })
      const wrote = global.fetch.mock.calls.filter(([, i]) => i?.method === 'PATCH')
      expect(wrote).toHaveLength(0)
    },
  )

  it('still marks an unknown kind answered rather than leaving it forever', async () => {
    await acceptSuggestion({ id: 's9', type: 'something_new' })
    expect(global.fetch.mock.calls.some(([u]) => String(u).includes('/s9/accept'))).toBe(true)
  })
})

describe('rejectSuggestion', () => {
  it('says no without writing anything else', async () => {
    await rejectSuggestion({ id: 's1' })
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch.mock.calls[0][0]).toContain('/s1/reject')
  })
})

describe('useSuggestions', () => {
  const load = async () => {
    const view = renderHook(() => useSuggestions())
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    return view
  }

  it('reads what the archive is wondering about', async () => {
    const { result } = await load()
    expect(result.current.suggestions).toEqual(SUGGESTIONS)
  })

  it('shows nothing rather than breaking when the list will not load', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }))
    const { result } = await load()
    expect(result.current.suggestions).toEqual([])
  })

  it('takes an answered one off the list without re-reading everything', async () => {
    const { result } = await load()
    const before = global.fetch.mock.calls.length
    await act(async () => { result.current.remove('s1') })
    expect(result.current.suggestions.map(s => s.id)).toEqual(['s2'])
    expect(global.fetch.mock.calls.length).toBe(before)
  })

  describe('looking again', () => {
    beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }) })
    afterEach(() => { vi.useRealTimers() })

    // The scan runs behind the request and finishes shortly after it returns.
    // Reloading straight away shows the old list and reads as "nothing
    // happened".
    it('waits for the scan before reading the list back', async () => {
      const { result } = await load()
      await act(async () => { await result.current.regenerate() })
      expect(result.current.generating).toBe(true)
      const before = global.fetch.mock.calls.length

      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(result.current.generating).toBe(false)
      expect(global.fetch.mock.calls.length).toBeGreaterThan(before)
    })
  })
})
