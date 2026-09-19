import { useEffect, useState } from 'react'

/**
 * What every processor has and has not touched.
 *
 * Unlike the Health page, this is not live: it is whatever the Archive Report
 * job last wrote. A week-old report on a busy week is misleading in the
 * direction of "everything is fine", so the page says when it was made and the
 * date is not buried.
 */
export function useArchiveReport() {
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    fetch('/api/admin/report')
      .then(r => (r.ok
        ? r.json()
        : Promise.reject(new Error('No report yet — run the Archive Report job first.'))))
      .then(d => { if (alive) setReport(d) })
      .catch(e => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [])

  return { report, error, loading: !report && !error }
}

/** The things a file gets given as it comes into the archive, in order. */
export const FIELDS = [
  ['mpp', 'Metadata read'],
  ['objects', 'Objects found'],
  ['clip', 'Described'],
  ['scenes', 'Scene understood'],
  ['md5', 'Fingerprinted'],
  ['perceptual', 'Visually fingerprinted'],
  ['gps', 'Located'],
  ['geo', 'Place named'],
  ['landmarks', 'Landmarks'],
]

export const ISSUES = [
  ['corrupted', 'Corrupt', true],
  ['missing_mpp', 'No metadata', true],
  ['missing_md5', 'No fingerprint', true],
  ['missing_perceptual', 'No visual fingerprint', true],
  ['missing_objects', 'No objects', false],
  ['missing_clip', 'No description', false],
  ['missing_scenes', 'No scene', false],
  ['no_gps', 'No location', false],
  ['gps_not_resolved', 'Location not named', false],
]

/** How complete one directory is, averaged over the things that must be done. */
export const REQUIRED = ['mpp', 'objects', 'clip', 'md5', 'perceptual']

export function pctOf(row, field) {
  if (!row.total || row[field] == null) return null
  return (row[field] / row.total) * 100
}

export function overallPct(row) {
  const vals = REQUIRED.map(f => pctOf(row, f)).filter(v => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

/**
 * Green once it is done, amber while it is going, red when something is
 * actually wrong. The middle band is wide on purpose: a directory at 96% is
 * mid-pass, not broken.
 */
export function pctTone(pct) {
  if (pct == null) return '#9aa0a6'
  if (pct >= 99) return '#137333'
  if (pct >= 80) return '#a15c00'
  return '#c5221f'
}

export const DIR_FILTERS = [
  { key: 'all', label: 'Everything', test: () => true },
  {
    key: 'issues',
    label: 'Something missing',
    test: r => r.total > 0 && REQUIRED.some(f => r[f] != null && r[f] < r.total),
  },
  {
    key: 'unseen',
    label: 'Not looked at',
    test: r => r.total > 0 && r.objects < r.total,
  },
  {
    key: 'no_gps',
    label: 'Mostly unlocated',
    test: r => r.total > 0 && (r.gps / r.total) < 0.5,
  },
]

/** Sort a list of rows by a column, one column at a time. */
export function sortRows(rows, key, ascending, value) {
  return [...rows].sort((a, b) => {
    const av = value(a, key)
    const bv = value(b, key)
    if (typeof av === 'string' || typeof bv === 'string') {
      return ascending
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    }
    return ascending ? (av ?? -1) - (bv ?? -1) : (bv ?? -1) - (av ?? -1)
  })
}
