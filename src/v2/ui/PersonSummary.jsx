import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { C } from './tokens'

/**
 * What the archive actually knows about somebody.
 *
 * The genealogy fields are mostly empty — 67 of 524 people have a birth date,
 * eighteen have notes — so an overview built only from those reads as though
 * the archive holds nothing. It holds a great deal; almost all of it is
 * derived. How many photographs somebody appears in, over how many years, how
 * many of those know where they were taken, what has been written down.
 *
 * Each figure links to the tab that explains it, so the strip is a way in
 * rather than a scoreboard.
 */
export function PersonSummary({ personId }) {
  const [stats, setStats] = useState({ forId: null })

  useEffect(() => {
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
    ]).then(([all, oldest, located, videos, collections, groups]) => {
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
      })
    })
    return () => { alive = false }
  }, [personId])

  if (stats.forId !== personId || !stats.photos) return null

  const span = stats.earliest && stats.latest && stats.earliest !== stats.latest
    ? `${stats.earliest}–${stats.latest}`
    : stats.latest

  const figures = [
    { label: 'Photographs', value: stats.photos, detail: span, to: null },
    stats.videos > 0 && { label: 'Videos', value: stats.videos },
    stats.located > 0 && {
      label: 'With a place', value: stats.located, to: 'travel',
    },
    stats.collections > 0 && {
      label: 'Collections', value: stats.collections, to: 'scrapbook',
    },
    stats.groups > 0 && { label: 'Groups', value: stats.groups, to: 'circles' },
  ].filter(Boolean)

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 22,
      padding: '12px 0 16px', marginBottom: 8,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {figures.map(f => {
        const body = (
          <>
            <span style={{
              display: 'block', fontSize: 19, color: C.text,
              fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
            }}>
              {f.value.toLocaleString()}
            </span>
            <span style={{ display: 'block', fontSize: 11.5, color: C.muted, marginTop: 2 }}>
              {f.label}{f.detail ? ` · ${f.detail}` : ''}
            </span>
          </>
        )
        return f.to
          ? (
            <Link key={f.label} to={`../${f.to}`} relative="path" style={{ textDecoration: 'none' }}>
              {body}
            </Link>
          )
          : <div key={f.label}>{body}</div>
      })}
    </div>
  )
}

const year = ts => (typeof ts === 'string' && ts.length >= 4 ? ts.slice(0, 4) : null)
