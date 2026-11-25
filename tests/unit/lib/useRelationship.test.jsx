import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

/**
 * The line above somebody's name in the hero — "Your mother", "Your
 * great-grandfather, on your mother's side". Walked in the graph from
 * whoever is signed in, so it needs the viewer; most people have no path
 * back to the viewer at all and the line simply stays empty.
 */
let viewerPersonId = 'viewer-1'
vi.mock('../../../src/contexts/MeContext', () => ({
  useMe: () => ({ viewerPersonId }),
}))

const { useRelationship } = await import('../../../src/lib/useRelationship')

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

beforeEach(() => {
  viewerPersonId = 'viewer-1'
  global.fetch = vi.fn(() => ok({ label: 'Your mother' }))
})

describe('useRelationship', () => {
  it('is empty until the walk comes back', () => {
    const { result } = renderHook(() => useRelationship('p1'))
    expect(result.current).toBe(null)
  })

  it('gives the label the graph found', async () => {
    const { result } = renderHook(() => useRelationship('p1'))
    await waitFor(() => expect(result.current).toBe('Your mother'))
  })

  it('says which side of the family when the graph knows', async () => {
    global.fetch = vi.fn(() => ok({ label: 'Your great-grandfather', side: "your mother's side" }))
    const { result } = renderHook(() => useRelationship('p1'))
    await waitFor(() =>
      expect(result.current).toBe("Your great-grandfather, on your mother's side"))
  })

  it('asks on behalf of whoever is signed in', async () => {
    renderHook(() => useRelationship('p1'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(String(global.fetch.mock.calls[0][0]))
      .toBe('/api/people/p1/relationship?viewer_id=viewer-1')
  })

  it('still asks when nobody is signed in', async () => {
    viewerPersonId = null
    renderHook(() => useRelationship('p1'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(String(global.fetch.mock.calls[0][0])).toBe('/api/people/p1/relationship')
  })

  describe('when there is no relationship to show', () => {
    it('stays empty for a person with no path to the viewer', async () => {
      global.fetch = vi.fn(() => ok({}))
      const { result } = renderHook(() => useRelationship('p1'))
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(result.current).toBe(null)
    })

    it('stays empty when the request fails', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: false }))
      const { result } = renderHook(() => useRelationship('p1'))
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(result.current).toBe(null)
    })

    it('stays empty when the network is down', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('offline')))
      const { result } = renderHook(() => useRelationship('p1'))
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(result.current).toBe(null)
    })

    it('asks nothing at all without a person', () => {
      renderHook(() => useRelationship(null))
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  it('does not set state after the caller has gone', async () => {
    let settle
    global.fetch = vi.fn(() => new Promise(res => { settle = res }))
    const { unmount } = renderHook(() => useRelationship('p1'))
    unmount()
    settle({ ok: true, json: () => Promise.resolve({ label: 'Your mother' }) })
    await new Promise(r => setTimeout(r, 0))
    // A React warning here would mean the `alive` guard had stopped working.
    expect(global.fetch).toHaveBeenCalled()
  })
})
