import { useCallback, useEffect, useState } from 'react'
import {
  assignCluster, assignClustersBulk, createPerson,
  getGroupedSuggestions, getLeftoverClusters, skipCluster,
} from '../lib/api'
import { useToast } from '../components/Toast'

/**
 * Everything the face review does, minus the drawing.
 *
 * Five flows share one screen because they are five answers to the same
 * question — who is this — arrived at from different amounts of evidence:
 *
 *   groups      faces that look like somebody already named
 *   ambiguous   faces that look like two people about equally
 *   candidates  faces that look like each other and nobody known
 *   leftover    clusters below the confidence bar, reviewed by hand
 *
 * Dismissals are kept client-side on purpose. Re-scoring is a twenty-five
 * second pass over the whole archive, so a card that has been dealt with is
 * hidden until the next explicit refresh rather than triggering one.
 */

const MARGIN = 0.05
const LIMIT = 100
const LEFTOVER_PAGE = 50

const THRESHOLD_KEY = 'ourkin:face-suggestions:threshold'
const MIN_CLUSTER_KEY = 'ourkin:face-suggestions:min-cluster-size'

export function useFaceReview() {
  // The context hands back { toast }, not the toast — reading it whole made
  // every toast.success a TypeError, which threw before the card could be
  // hidden. The assign had already succeeded, so the work landed and the
  // screen simply never moved.
  const { toast } = useToast()
  const [threshold, setThreshold] = useState(() => read(THRESHOLD_KEY, 0.8))
  const [minClusterSize, setMinClusterSize] = useState(() => read(MIN_CLUSTER_KEY, 2))
  const [data, setData] = useState(null)
  const [leftover, setLeftover] = useState({ items: [], total: 0, loading: false })
  const [remaining, setRemaining] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [hidden, setHidden] = useState(() => new Set())

  useEffect(() => { write(THRESHOLD_KEY, threshold) }, [threshold])
  useEffect(() => { write(MIN_CLUSTER_KEY, minClusterSize) }, [minClusterSize])

  const countRemaining = useCallback(() => {
    fetch('/api/faces/unassigned/count')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setRemaining(d.remaining))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setHidden(new Set())
    countRemaining()
    try {
      setData(await getGroupedSuggestions({
        threshold, margin: MARGIN, limit: LIMIT, minClusterSize,
      }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }

    setLeftover({ items: [], total: 0, loading: true })
    try {
      const lf = await getLeftoverClusters({ threshold, offset: 0, limit: LEFTOVER_PAGE })
      setLeftover({ items: lf.leftover, total: lf.total, loading: false })
    } catch {
      setLeftover({ items: [], total: 0, loading: false })
    }
  }, [threshold, minClusterSize, countRemaining])

  // Deliberately not calling `load` straight from the effect body: it opens by
  // setting three pieces of state, which starts another render before this one
  // has painted.
  useEffect(() => { queueMicrotask(load) }, [load])

  const hide = key => setHidden(prev => new Set(prev).add(key))

  const moreLeftover = useCallback(async () => {
    setLeftover(prev => ({ ...prev, loading: true }))
    try {
      const lf = await getLeftoverClusters({
        threshold, offset: leftover.items.length, limit: LEFTOVER_PAGE,
      })
      setLeftover(prev => ({
        items: [...prev.items, ...lf.leftover], total: lf.total, loading: false,
      }))
    } catch {
      setLeftover(prev => ({ ...prev, loading: false }))
    }
  }, [threshold, leftover.items.length])

  /** Run something, keep the screen honest about it, and say what happened. */
  const act = useCallback(async (fn) => {
    setBusy(true)
    try {
      return await fn()
    } catch (e) {
      // Never let the reporting of a failure become a second failure: an
      // exception here would replace a bad message with a blank screen.
      try { toast?.error?.(e.message || 'That did not work') } catch { /* say nothing */ }
      return null
    } finally {
      setBusy(false)
      countRemaining()
    }
  }, [toast, countRemaining])

  return {
    threshold, setThreshold, minClusterSize, setMinClusterSize,
    data, leftover, remaining, loading, busy, error, hidden,
    reload: load, moreLeftover, hide,

    // ── the five answers ─────────────────────────────────────────────────────

    confirmGroup: (group, clusters) => act(async () => {
      // One bulk call: per-cluster assigns stampeded the transaction pool on
      // groups of any size, and each one triggered its own brain rebuild.
      const res = await assignClustersBulk(clusters.map(c => c.cluster_id), group.person_id)
      const n = res.assigned ?? clusters.reduce((sum, c) => sum + c.n_faces, 0)
      toast.success(`Confirmed ${n.toLocaleString()} ${n === 1 ? 'face' : 'faces'} as ${group.person_name}`)
      hide(group.person_id)
    }),

    pickCandidate: (entry, candidate) => act(async () => {
      await assignCluster(entry.cluster_id, candidate.person_id)
      toast.success(`${entry.n_faces} faces assigned to ${candidate.person_name}`)
      hide(entry.cluster_id)
    }),

    nameUnknown: (candidate, name) => act(async () => {
      const person = await createPerson({ name })
      const assigned = await assignAll(candidate.clusters, person.id)
      toast.success(`Created ${name} and assigned ${assigned.toLocaleString()} faces`)
      hide(candidate.candidate_id)
    }),

    assignUnknown: (candidate, personId, personName) => act(async () => {
      const assigned = await assignAll(candidate.clusters, personId)
      toast.success(`${assigned.toLocaleString()} faces assigned to ${personName}`)
      hide(candidate.candidate_id)
    }),

    // Somebody real whose name nobody remembers. A placeholder keeps the faces
    // together so they can be named later in one go, rather than being
    // rediscovered as strangers on every pass.
    parkUnknown: (candidate) => act(async () => {
      const name = `Unknown person ${stamp()}`
      const person = await createPerson({ name })
      await assignAll(candidate.clusters, person.id)
      toast.info(`Parked as “${name}” — rename them when you find out`)
      hide(candidate.candidate_id)
    }),

    skipForever: (candidate) => act(async () => {
      for (const cluster of candidate.clusters) await skipCluster(cluster.cluster_id)
      toast.info('Skipped — these will not come back')
      hide(candidate.candidate_id)
    }),

    // ── leftovers, one cluster at a time ────────────────────────────────────

    assignCluster: (cluster, personId, personName) => act(async () => {
      await assignCluster(cluster.cluster_id, personId)
      toast.success(`${cluster.n_faces} faces assigned to ${personName}`)
      hide(cluster.cluster_id)
    }),

    createForCluster: (cluster, name) => act(async () => {
      const person = await createPerson({ name })
      await assignCluster(cluster.cluster_id, person.id)
      toast.success(`Created ${name} and assigned ${cluster.n_faces} faces`)
      hide(cluster.cluster_id)
    }),

    parkCluster: (cluster) => act(async () => {
      const name = `Unknown person ${stamp()}`
      const person = await createPerson({ name })
      await assignCluster(cluster.cluster_id, person.id)
      toast.info(`Parked as “${name}”`)
      hide(cluster.cluster_id)
    }),

    skipCluster: (cluster) => act(async () => {
      await skipCluster(cluster.cluster_id)
      toast.info(`Skipped ${cluster.n_faces} faces for good`)
      hide(cluster.cluster_id)
    }),
  }
}

async function assignAll(clusters, personId) {
  let assigned = 0
  for (const cluster of clusters) {
    try {
      await assignCluster(cluster.cluster_id, personId)
      assigned += cluster.n_faces
    } catch { /* one bad cluster should not lose the rest */ }
  }
  return assigned
}

const stamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : Number(v)
  } catch { return fallback }
}
const write = (key, value) => {
  try { localStorage.setItem(key, String(value)) } catch { /* private window */ }
}
