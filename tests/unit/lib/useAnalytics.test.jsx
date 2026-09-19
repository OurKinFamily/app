import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useAnalytics, shareOf, drillInto, HUES, BRIGHTNESS,
} from '../../../src/lib/useAnalytics'

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

beforeEach(() => {
  global.fetch = vi.fn(url => {
    if (String(url).includes('archive-overview')) return ok({ media: { total: 100 } })
    if (String(url).includes('summary')) return ok({ available: true })
    return ok({ buckets: [{ key: 'a', label: 'A', count: 3 }] })
  })
})

describe('shareOf', () => {
  it('gives a bucket as a percentage of its own slice', () => {
    const all = [{ count: 25 }, { count: 75 }]
    expect(shareOf({ count: 25 }, all)).toBe(25)
  })

  it('does not divide by zero on an empty slice', () => {
    expect(shareOf({ count: 0 }, [])).toBe(0)
    expect(shareOf({ count: 0 }, null)).toBe(0)
  })
})

describe('drillInto', () => {
  it('builds both URLs for the slice being opened', () => {
    const drill = drillInto('weekday', 3, { title: 'Wednesday', count: 10, percent: 5 })
    expect(drill.insightsUrl).toBe('/api/admin/analytics/weekday/3/insights?limit=5')
    expect(drill.samplesUrl).toBe('/api/admin/analytics/weekday/3/samples?limit=48')
  })

  it('escapes a key that would otherwise break the URL', () => {
    const drill = drillInto('camera', 'Canon EOS 5D', { title: 'Canon', count: 1, percent: 1 })
    expect(drill.samplesUrl).toContain('Canon%20EOS%205D')
  })

  // "The most common day is Sunday" is not worth the space inside the Sunday
  // bucket.
  it('carries what to leave out of the answer', () => {
    expect(drillInto('weekday', 0, { title: 'x', count: 1, percent: 1, hide: ['weekday'] }).hide)
      .toEqual(['weekday'])
  })

  it('hides nothing by default', () => {
    expect(drillInto('hour', 9, { title: 'x', count: 1, percent: 1 }).hide).toEqual([])
  })
})

describe('the colours', () => {
  it('knows a swatch for every hue the archive reports', () => {
    for (const hue of ['red', 'blue', 'green', 'black', 'white', 'mixed']) {
      expect(HUES[hue]).toMatch(/^#/)
    }
  })

  it('spells grey both ways, because the archive does', () => {
    expect(HUES.gray).toBe(HUES.grey)
  })

  it('has a shade for each brightness band', () => {
    expect(Object.keys(BRIGHTNESS).sort()).toEqual(['bright', 'dark', 'mid'])
  })
})

describe('useAnalytics', () => {
  const load = async () => {
    const view = renderHook(() => useAnalytics())
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    return view
  }

  it('reads the overview', async () => {
    const { result } = await load()
    expect(result.current.data).toMatchObject({ media: { total: 100 } })
  })

  it('asks for every way of slicing it', async () => {
    await load()
    const asked = global.fetch.mock.calls.map(c => String(c[0]))
    for (const slice of ['weekday', 'hour', 'month', 'camera', 'people', 'location', 'state', 'decade']) {
      expect(asked.some(u => u.includes(`/${slice}/buckets`)), slice).toBe(true)
    }
  })

  it('fills each slice in as it lands', async () => {
    const { result } = await load()
    await waitFor(() => expect(result.current.buckets.weekday).toBeDefined())
    expect(result.current.buckets.weekday).toEqual([{ key: 'a', label: 'A', count: 3 }])
  })

  it('reads the face and scene summaries too', async () => {
    const { result } = await load()
    await waitFor(() => expect(result.current.summaries.faceClusters).toBeDefined())
    expect(result.current.summaries.scenes).toMatchObject({ available: true })
  })

  // A page with fourteen sections has nothing useful to say about one of them
  // being unavailable.
  it('leaves out a slice that will not load, without failing the page', async () => {
    global.fetch = vi.fn(url => (
      String(url).includes('archive-overview')
        ? ok({ media: { total: 1 } })
        : Promise.reject(new Error('nope'))
    ))
    const { result } = await load()
    expect(result.current.data).toBeTruthy()
    expect(result.current.buckets.weekday).toBeUndefined()
    expect(result.current.error).toBeNull()
  })

  it('says so when the overview itself will not load', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }))
    const { result } = renderHook(() => useAnalytics())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error).toContain('500')
  })

  it('ignores a bucket answer that carries no buckets', async () => {
    global.fetch = vi.fn(url => (
      String(url).includes('archive-overview') ? ok({ media: {} }) : ok({})
    ))
    const { result } = await load()
    await waitFor(() => expect(result.current.buckets.weekday).toEqual([]))
  })
})
