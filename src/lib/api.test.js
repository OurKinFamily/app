import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPeople, getPerson, getRelatives } from './api'

beforeEach(() => {
  vi.resetAllMocks()
})

function mockFetch(data) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  })
}

function mockFetchFail() {
  global.fetch = vi.fn().mockResolvedValue({ ok: false })
}

describe('getPeople', () => {
  it('fetches and returns people list', async () => {
    const people = [{ id: 'person-1', name: 'Test' }]
    mockFetch(people)
    const result = await getPeople()
    expect(fetch).toHaveBeenCalledWith('/api/people/')
    expect(result).toEqual(people)
  })

  it('throws on non-ok response', async () => {
    mockFetchFail()
    await expect(getPeople()).rejects.toThrow('Failed to fetch people')
  })
})

describe('getPerson', () => {
  it('fetches a single person by id', async () => {
    const person = { id: 'person-1', name: 'Test' }
    mockFetch(person)
    const result = await getPerson('person-1')
    expect(fetch).toHaveBeenCalledWith('/api/people/person-1')
    expect(result).toEqual(person)
  })

  it('throws on not found', async () => {
    mockFetchFail()
    await expect(getPerson('nobody')).rejects.toThrow('Person not found')
  })
})

describe('getRelatives', () => {
  it('fetches relatives for a person', async () => {
    const relatives = { parents: [], children: [], spouses: [] }
    mockFetch(relatives)
    const result = await getRelatives('person-1')
    expect(fetch).toHaveBeenCalledWith('/api/people/person-1/relatives')
    expect(result).toEqual(relatives)
  })

  it('throws on failure', async () => {
    mockFetchFail()
    await expect(getRelatives('person-1')).rejects.toThrow('Failed to fetch relatives')
  })
})
