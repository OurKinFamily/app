import { useCallback, useEffect, useRef, useState } from 'react'
import { getClusters } from '../../lib/api'

/**
 * The queue of face groups nobody has named yet.
 *
 * Loaded fifty at a time. Two ways a group leaves: skipped, and it goes
 * entirely; or assigned, which may only take some of the faces — a group of
 * four hundred is often two people, and the rest stays behind.
 *
 * Selection follows the work rather than the list. When the thing you were
 * looking at empties, the next one takes its place, because the alternative is
 * being dropped back to nothing after every assign.
 */
const PAGE = 50

// Faces most likely to be the answer, offered as one-click chips. Saves typing
// the same five names several hundred times an evening.
const QUICK_PEOPLE = [
  'person-stephen',
  'person-stephen-sr',
  'person-patty',
  'person-david',
  'person-john-forrence',
]

export function useClusterQueue() {
  const [clusters, setClusters] = useState([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [quickPeople, setQuickPeople] = useState([])
  const offset = useRef(0)

  useEffect(() => {
    let alive = true
    Promise.all(QUICK_PEOPLE.map(id =>
      fetch(`/api/people/${id}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    )).then(people => { if (alive) setQuickPeople(people.filter(Boolean)) })
    return () => { alive = false }
  }, [])

  const load = useCallback(async (from, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const data = await getClusters('unassigned', PAGE, from)
      setClusters(prev => (append ? [...prev, ...data.clusters] : data.clusters))
      setTotal(data.total)
      setHasMore(from + PAGE < data.total)
      offset.current = from + data.clusters.length
      if (!append) setSelected(null)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Deferred by a microtask. load() flips the loading flag on its first line,
  // and doing that straight from an effect body starts a second render before
  // the first has painted.
  useEffect(() => { queueMicrotask(() => load(0)) }, [load])

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) load(offset.current, true)
  }, [hasMore, loadingMore, load])

  /** Skipped: the whole group goes, and the slot it held is taken by the next. */
  const remove = useCallback(clusterId => {
    setClusters(prev => {
      const at = prev.findIndex(c => c.id === clusterId)
      const next = prev.filter(c => c.id !== clusterId)
      setSelected(old => (old?.id === clusterId ? next[at] || next[at - 1] || next[0] || null : old))
      return next
    })
    setTotal(t => t - 1)
  }, [])

  /** Assigned: some faces left. Empty groups fall out; a partial one stays put. */
  const drain = useCallback((clusterId, taken) => {
    if (!taken) return
    setClusters(prev => {
      const updated = prev.map(c => (
        c.id === clusterId ? { ...c, size: Math.max(0, c.size - taken) } : c
      ))
      const next = updated.filter(c => c.size > 0)
      const emptied = updated.findIndex(c => c.id === clusterId && c.size <= 0)
      if (emptied >= 0) setSelected(next[emptied] || next[emptied - 1] || next[0] || null)
      else setSelected(old => (
        old?.id === clusterId ? { ...old, size: Math.max(0, old.size - taken) } : old
      ))
      return next
    })
  }, [])

  return {
    clusters, total, selected, setSelected,
    loading, loadingMore, hasMore, loadMore,
    quickPeople, remove, drain,
  }
}
