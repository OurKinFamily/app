import { useEffect, useState } from 'react'

/**
 * What the archive actually knows about somebody.
 *
 * The genealogy fields are mostly empty — 67 of 524 people have a birth date,
 * eighteen have notes — so a page built only from those reads as though the
 * archive holds nothing. It holds a great deal; almost all of it is derived.
 * How many photographs somebody appears in, over how many years, how far back
 * their line is recorded.
 *
 * Lifted out of PersonSummary when the figures moved up into the hero.
 * Returns `null` until the counts are in, so callers can hold their layout
 * rather than flash a row of zeroes.
 */
export function usePersonStats(personId) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!personId) return
    let alive = true
    const base = `/api/gallery?person_ids=${personId}&min_confidence=all&limit=1`
    const count = url => fetch(url).then(r => (r.ok ? r.json() : {}))

    Promise.all([
      count(base),
      count(`${base}&sort=asc`),
      count(`${base}&gps=has`),
      count(`${base}&media_type=video`),
      fetch(`/api/people/${personId}/collections`).then(r => (r.ok ? r.json() : [])),
      fetch(`/api/people/${personId}/groups`).then(r => (r.ok ? r.json() : [])),
      // Ahnentafel pedigree. The walk stops as soon as a generation turns up
      // nothing, so asking for eight costs no more than asking for two on the
      // many people whose records run out at their grandparents.
      fetch(`/api/people/${personId}/ancestors?generations=8`)
        .then(r => (r.ok ? r.json() : null)),
    ]).then(([all, oldest, located, videos, collections, groups, pedigree]) => {
      if (!alive) return
      setStats({
        forId: personId,
        photos: all.total || 0,
        // The last item of a descending list and the first of an ascending one
        // are the two ends of a life in pictures, for two cheap requests.
        latest: year(all.media?.[0]?.timestamp),
        earliest: year(oldest.media?.[0]?.timestamp),
        located: located.total || 0,
        videos: videos.total || 0,
        collections: Array.isArray(collections) ? collections.length : 0,
        groups: Array.isArray(groups) ? groups.length : 0,
        ancestors: Array.isArray(pedigree?.ancestors) ? pedigree.ancestors.length : 0,
      })
    }).catch(() => {})

    return () => { alive = false }
  }, [personId])

  return stats && stats.forId === personId ? stats : null
}

/** "1961–2026", or just the one year when a life in pictures spans a day. */
export function spanOf(stats) {
  if (!stats) return null
  const { earliest, latest } = stats
  if (earliest && latest && earliest !== latest) return `${earliest}–${latest}`
  return latest || earliest || null
}

const year = ts => (typeof ts === 'string' && ts.length >= 4 ? ts.slice(0, 4) : null)
