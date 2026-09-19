import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useJobs, useRunLog, defaultParams, runDuration } from '../../../src/lib/useJobs'

const JOBS = [{ id: 'faces-index', name: 'Build Face Index' }]
const RUNS = [{ id: 'r1', job_id: 'faces-index', status: 'running', started_at: '2026-09-19T10:00:00Z' }]

// One place that answers every jobs URL, so tests vary the data not the wiring.
function server(over = {}) {
  const data = { jobs: JOBS, runs: RUNS, log: { text: '', offset: 0 }, run: RUNS[0], ...over }
  global.fetch = vi.fn((url, init) => {
    const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
    if (init?.method === 'POST') return data.startResponse || ok({ id: 'r2' })
    if (url.includes('/log')) return ok(data.log)
    if (/\/runs\/[^/]+$/.test(url)) return ok(data.run)
    if (url.endsWith('/runs')) return ok(data.runs)
    return ok(data.jobs)
  })
  return data
}

describe('defaultParams', () => {
  it('starts a form from the job’s own defaults', () => {
    expect(defaultParams({ params: [{ name: 'since', default: '2026-01-01' }] }))
      .toEqual({ since: '2026-01-01' })
  })

  it('starts a flag off rather than undefined', () => {
    expect(defaultParams({ params: [{ name: 'force', type: 'flag' }] })).toEqual({ force: false })
  })

  it('starts a text field empty rather than undefined', () => {
    expect(defaultParams({ params: [{ name: 'path', type: 'text' }] })).toEqual({ path: '' })
  })

  it.each([[null], [undefined], [{}]])('gives an empty form for %s', (job) => {
    expect(defaultParams(job)).toEqual({})
  })
})

describe('runDuration', () => {
  const at = (from, to) => runDuration({ started_at: from, finished_at: to })

  // Only the still-running cases need the clock held still, but the mock is
  // global — left on, it leaks into whichever describe vitest runs next.
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('counts seconds for a short run', () => {
    expect(at('2026-09-19T10:00:00Z', '2026-09-19T10:00:42Z')).toBe('42s')
  })

  it('counts minutes and seconds', () => {
    expect(at('2026-09-19T10:00:00Z', '2026-09-19T10:07:05Z')).toBe('7m 5s')
  })

  // A face pass over the archive is measured in hours.
  it('counts hours and minutes for a long one', () => {
    expect(at('2026-09-19T10:00:00Z', '2026-09-19T13:30:00Z')).toBe('3h 30m')
  })

  it('counts up to now while it is still going', () => {
    vi.setSystemTime(new Date('2026-09-19T10:00:30Z'))
    expect(runDuration({ started_at: '2026-09-19T10:00:00Z' })).toBe('30s')
  })

  it('has nothing to say about a run that never started', () => {
    expect(runDuration({})).toBeNull()
    expect(runDuration(null)).toBeNull()
  })

  // Clocks disagree; a run must never appear to have taken minus four seconds.
  it('never reports a negative duration', () => {
    vi.setSystemTime(new Date('2026-09-19T10:00:00Z'))
    expect(runDuration({ started_at: '2026-09-19T10:00:04Z' })).toBe('0s')
  })
})

describe('useJobs', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); server() })
  afterEach(() => { vi.useRealTimers() })

  const load = async () => {
    const view = renderHook(() => useJobs())
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    return view
  }

  it('reads the jobs and their runs', async () => {
    const { result } = await load()
    expect(result.current.jobs).toEqual(JOBS)
    expect(result.current.runs).toEqual(RUNS)
  })

  // A run is long and a socket that survives hours is more machinery than a
  // five-second poll deserves.
  it('keeps asking for the runs while the page is open', async () => {
    const { result } = await load()
    const before = global.fetch.mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(global.fetch.mock.calls.length).toBeGreaterThan(before)
    expect(result.current.runs).toEqual(RUNS)
  })

  it('stops polling once the page is closed', async () => {
    const { unmount } = await load()
    unmount()
    const after = global.fetch.mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
    expect(global.fetch.mock.calls.length).toBe(after)
  })

  // Closing the page mid-request must not set state on a hook that has gone.
  it('drops the answer when the page closes before it arrives', async () => {
    // Both requests go out at once, so every one of them has to be answered
    // or the Promise.all never settles and the guard is never reached.
    const answers = []
    global.fetch = vi.fn(() => new Promise(resolve => answers.push(resolve)))
    const { unmount } = renderHook(() => useJobs())
    unmount()
    await act(async () => {
      answers.forEach(a => a({ ok: true, json: () => Promise.resolve(JOBS) }))
      for (let i = 0; i < 5; i++) await Promise.resolve()
    })
    expect(true).toBe(true)  // no "state update on an unmounted hook" warning
  })

  it('survives an endpoint that will not answer', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('down')))
    const { result } = renderHook(() => useJobs())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.jobs).toEqual([])
    expect(result.current.runs).toEqual([])
  })

  it('ignores an answer that is not a list', async () => {
    server({ jobs: { detail: 'nope' }, runs: null })
    const { result } = renderHook(() => useJobs())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.jobs).toEqual([])
    expect(result.current.runs).toEqual([])
  })

  describe('starting one', () => {
    it('sends the job and its arguments', async () => {
      const { result } = await load()
      await act(async () => { await result.current.start(JOBS[0], { force: true }) })
      const post = global.fetch.mock.calls.find(([, init]) => init?.method === 'POST')
      expect(post[0]).toBe('/api/jobs/runs')
      expect(JSON.parse(post[1].body)).toEqual({ job_id: 'faces-index', params: { force: true } })
    })

    it('refreshes the runs so the new one appears', async () => {
      const { result } = await load()
      const before = global.fetch.mock.calls.filter(c => c[0] === '/api/jobs/runs' && !c[1]).length
      await act(async () => { await result.current.start(JOBS[0], {}) })
      const after = global.fetch.mock.calls.filter(c => c[0] === '/api/jobs/runs' && !c[1]).length
      expect(after).toBeGreaterThan(before)
    })

    it('passes the reason along when the server refuses', async () => {
      server({ startResponse: Promise.resolve({ ok: false, json: () => Promise.resolve({ detail: 'already running' }) }) })
      const { result } = await load()
      await expect(result.current.start(JOBS[0], {})).rejects.toThrow('already running')
      expect(result.current.starting).toBe(false)
    })

    it('says something even when the refusal has no reason', async () => {
      server({ startResponse: Promise.resolve({ ok: false, json: () => Promise.resolve({}) }) })
      const { result } = await load()
      await expect(result.current.start(JOBS[0], {})).rejects.toThrow('Could not start')
    })
  })
})

describe('useRunLog', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }) })
  afterEach(() => { vi.useRealTimers() })

  it('shows nothing until a run is chosen', async () => {
    server()
    const { result } = renderHook(() => useRunLog(null))
    expect(result.current.text).toBe('')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('reads the log from the start', async () => {
    server({ log: { text: 'loading model\n', offset: 14 } })
    const { result } = renderHook(() => useRunLog('r1'))
    await waitFor(() => expect(result.current.text).toBe('loading model\n'))
    expect(global.fetch.mock.calls[0][0]).toContain('offset=0')
  })

  // These logs reach hundreds of megabytes on a full archive pass; re-fetching
  // from the top every two seconds would be its own outage.
  it('asks only for what it has not read yet', async () => {
    const data = server({ log: { text: 'first\n', offset: 6 } })
    renderHook(() => useRunLog('r1'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    data.log = { text: 'second\n', offset: 13 }
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    const logCalls = global.fetch.mock.calls.filter(c => String(c[0]).includes('/log'))
    expect(logCalls.at(-1)[0]).toContain('offset=6')
  })

  it('adds each piece to what came before', async () => {
    const data = server({ log: { text: 'one\n', offset: 4 } })
    const { result } = renderHook(() => useRunLog('r1'))
    await waitFor(() => expect(result.current.text).toBe('one\n'))

    data.log = { text: 'two\n', offset: 8 }
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    await waitFor(() => expect(result.current.text).toBe('one\ntwo\n'))
  })

  it('counts the characters itself when the server does not say where it got to', async () => {
    const data = server({ log: { text: 'abc' } })
    renderHook(() => useRunLog('r1'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    data.log = { text: 'de' }
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    const logCalls = global.fetch.mock.calls.filter(c => String(c[0]).includes('/log'))
    expect(logCalls.at(-1)[0]).toContain('offset=3')
  })

  it('stops following once the run has finished', async () => {
    server({ run: { id: 'r1', status: 'finished' } })
    const { result } = renderHook(() => useRunLog('r1'))
    await waitFor(() => expect(result.current.done).toBe(true))
  })

  it('starts afresh when a different run is opened', async () => {
    const data = server({ log: { text: 'first run\n', offset: 10 } })
    const { result, rerender } = renderHook(({ id }) => useRunLog(id), {
      initialProps: { id: 'r1' },
    })
    await waitFor(() => expect(result.current.text).toBe('first run\n'))

    data.log = { text: 'second run\n', offset: 11 }
    rerender({ id: 'r2' })
    await waitFor(() => expect(result.current.text).toBe('second run\n'))
  })

  it('drops a late log when the viewer has been closed', async () => {
    const answers = []
    global.fetch = vi.fn(() => new Promise(resolve => answers.push(resolve)))
    const { result, unmount } = renderHook(() => useRunLog('r1'))
    unmount()
    await act(async () => {
      answers.forEach(a => a({ ok: true, json: () => Promise.resolve({ text: 'late\n', offset: 5 }) }))
      for (let i = 0; i < 5; i++) await Promise.resolve()
    })
    expect(result.current.text).toBe('')
  })

  it('survives a log that will not load', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('gone')))
    const { result } = renderHook(() => useRunLog('r1'))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(result.current.text).toBe('')
  })
})
