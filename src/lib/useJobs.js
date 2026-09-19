import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The back-of-house jobs: face detection, clustering, object detection, the
 * archive report.
 *
 * Runs are polled rather than pushed. They are long — a face pass over the
 * archive is measured in hours — and a socket that has to survive that is more
 * machinery than a five-second poll deserves.
 */

const API = '/api/jobs'
const POLL_MS = 5000

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [runs, setRuns] = useState([])
  const [starting, setStarting] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshRuns = useCallback(async () => {
    const r = await fetch(`${API}/runs`).then(res => res.json()).catch(() => null)
    if (Array.isArray(r)) setRuns(r)
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch(API).then(r => r.json()).catch(() => []),
      fetch(`${API}/runs`).then(r => r.json()).catch(() => []),
    ]).then(([j, r]) => {
      if (!alive) return
      setJobs(Array.isArray(j) ? j : [])
      setRuns(Array.isArray(r) ? r : [])
      setLoading(false)
    })
    const timer = setInterval(refreshRuns, POLL_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [refreshRuns])

  const start = useCallback(async (job, params) => {
    setStarting(true)
    try {
      const res = await fetch(`${API}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, params }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Could not start')
      await refreshRuns()
      return await res.json().catch(() => null)
    } finally {
      setStarting(false)
    }
  }, [refreshRuns])

  return { jobs, runs, loading, starting, start, refreshRuns }
}

/**
 * A run's log, fetched in pieces from wherever we got to.
 *
 * Offsets rather than the whole file each time: these logs reach hundreds of
 * megabytes on a full archive pass, and re-fetching from the top every two
 * seconds would be its own outage.
 */
export function useRunLog(runId) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const offset = useRef(0)

  useEffect(() => {
    if (!runId) return
    let alive = true
    offset.current = 0
    // Cleared on the first tick rather than in the effect body: assigning
    // state here starts another render before this one has painted.
    let first = true

    const tick = async () => {
      const [logRes, runRes] = await Promise.all([
        fetch(`${API}/runs/${runId}/log?offset=${offset.current}`).then(r => r.json()).catch(() => null),
        fetch(`${API}/runs/${runId}`).then(r => r.json()).catch(() => null),
      ])
      if (!alive) return
      if (first) { setText(''); setDone(false); first = false }
      if (logRes?.text) {
        offset.current = logRes.offset ?? offset.current + logRes.text.length
        setText(prev => prev + logRes.text)
      }
      if (runRes && runRes.status !== 'running') setDone(true)
    }

    tick()
    const timer = setInterval(tick, 2000)
    return () => { alive = false; clearInterval(timer) }
  }, [runId])

  return { text, done }
}

/** Sensible starting values for a job's form, from the job's own defaults. */
export const defaultParams = job =>
  Object.fromEntries((job?.params || []).map(p => [p.name, p.default ?? (p.type === 'flag' ? false : '')]))

/** How long a run took, or has been going. */
export function runDuration(run) {
  if (!run?.started_at) return null
  const start = new Date(run.started_at)
  const end = run.finished_at ? new Date(run.finished_at) : new Date()
  const seconds = Math.max(0, Math.round((end - start) / 1000))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}
