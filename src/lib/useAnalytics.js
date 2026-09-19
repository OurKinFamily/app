import { useEffect, useState } from 'react'

/**
 * Everything the archive knows about itself.
 *
 * One overview call plus a bucket call per way of slicing it. They are fired
 * together and land as they land — the page is a long scroll of independent
 * sections, and a slow query about cameras should not hold up the counts at
 * the top.
 */
const BUCKETS = {
  weekday: 'weekday/buckets',
  hour: 'hour/buckets',
  month: 'month/buckets',
  camera: 'camera/buckets?limit=10',
  people: 'people/buckets?limit=10',
  location: 'location/buckets?limit=15',
  state: 'state/buckets?limit=15',
  decade: 'decade/buckets?limit=3',
}

const SUMMARIES = {
  faceClusters: 'face_clusters/summary',
  scenes: 'scenes/summary',
}

export function useAnalytics() {
  const [data, setData] = useState(null)
  const [buckets, setBuckets] = useState({})
  const [summaries, setSummaries] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true

    fetch('/api/admin/archive-overview')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`The overview came back ${r.status}`))))
      .then(d => { if (alive) setData(d) })
      .catch(e => { if (alive) setError(e.message) })

    for (const [name, path] of Object.entries(BUCKETS)) {
      fetch(`/api/admin/analytics/${path}`)
        .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(d => { if (alive) setBuckets(b => ({ ...b, [name]: d.buckets || [] })) })
        // A slice that will not load leaves its own section out. There is no
        // useful thing to say about "by camera" being unavailable on a page
        // with fourteen other sections on it.
        .catch(() => {})
    }

    for (const [name, path] of Object.entries(SUMMARIES)) {
      fetch(`/api/admin/analytics/${path}`)
        .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(d => { if (alive) setSummaries(s => ({ ...s, [name]: d })) })
        .catch(() => {})
    }

    return () => { alive = false }
  }, [])

  return { data, buckets, summaries, error, loading: !data && !error }
}

/** What a bucket is worth as a share of its own slice. */
export const shareOf = (bucket, all) => {
  const total = (all || []).reduce((a, b) => a + b.count, 0)
  return total ? (bucket.count / total) * 100 : 0
}

/**
 * The two halves of a drill-in: what else is true of these photographs, and a
 * wall of them.
 *
 * `hide` drops the card for the thing already being filtered by — "the most
 * common day is Sunday" is not worth the space inside the Sunday bucket.
 */
export const drillInto = (kind, key, { title, hero, count, percent, hide = [] }) => ({
  title,
  hero,
  count,
  percent,
  hide,
  insightsUrl: `/api/admin/analytics/${kind}/${encodeURIComponent(key)}/insights?limit=5`,
  samplesUrl: `/api/admin/analytics/${kind}/${encodeURIComponent(key)}/samples?limit=48`,
})

export const HUES = {
  red: '#ef4444', orange: '#f97316', yellow: '#eab308', green: '#22c55e',
  cyan: '#06b6d4', blue: '#3b82f6', purple: '#a855f7', magenta: '#ec4899',
  brown: '#92400e', gray: '#9ca3af', grey: '#9ca3af',
  black: '#18181b', white: '#f4f4f5', mixed: '#78716c',
}

export const BRIGHTNESS = { dark: '#1f2937', mid: '#71717a', bright: '#e4e4e7' }
