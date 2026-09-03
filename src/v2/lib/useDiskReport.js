import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * What is actually on disk, and how far it has drifted from the graph.
 *
 * The scan takes its time — it walks every file under /photos — so the report
 * is served from a cache and only re-walked when asked.
 *
 * Archive and heritage are the systems of record and are expected to agree
 * with the graph exactly. Staging is a workspace: its unindexed files are
 * backlog waiting for somebody to triage them, not drift, and counting them
 * as drift made a healthy archive look permanently broken.
 */
const PROD_ROOTS = ['archive', 'heritage']

export function useDiskReport() {
  const [disk, setDisk] = useState(null)
  const [error, setError] = useState(null)
  const [rescanning, setRescanning] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/disk-report')
    if (!r.ok) throw new Error(`The report came back ${r.status}`)
    return r.json()
  }, [])

  useEffect(() => {
    let alive = true
    load()
      .then(d => { if (alive) setDisk(d) })
      .catch(e => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [load])

  const rescan = useCallback(async () => {
    setRescanning(true)
    try {
      await fetch('/api/admin/disk-report/refresh', { method: 'POST' })
      setDisk(await load())
    } catch (e) {
      setError(e.message)
    } finally {
      setRescanning(false)
    }
  }, [load])

  const summary = useMemo(() => disk && summarise(disk), [disk])

  return { disk, summary, error, rescanning, rescan }
}

function summarise(disk) {
  const dirs = disk.directories || {}
  const drift = disk.drift || {}
  const unindexedByRoot = drift.on_disk_not_in_graph?.by_root || {}
  const staleByRoot = drift.in_graph_not_on_disk?.by_root || {}
  const sum = (pick) => PROD_ROOTS.reduce((a, r) => a + pick(r), 0)

  const onDisk = sum(r => dirs[r]?.media_total || 0)
  const inGraph = sum(r => dirs[r]?.graph_total || 0)
  const unindexed = sum(r => unindexedByRoot[r] || 0)
  const stale = sum(r => staleByRoot[r] || 0)
  const inSync = Math.min(onDisk, inGraph) - stale

  return {
    dirs,
    drift,
    onDisk,
    inGraph,
    unindexed,
    stale,
    missing: unindexed + stale,
    syncPct: onDisk ? (inSync / onDisk) * 100 : 0,
    staging: {
      onDisk: dirs.staging?.media_total || 0,
      inGraph: dirs.staging?.graph_total || 0,
    },
    totalBytes: Object.values(dirs).reduce((a, d) => a + (d.media_bytes || 0), 0),
    // '0000' is the bucket for files with no readable date at all. It is a
    // number worth knowing but not a year, and charted beside 1897 it made
    // every real year a sliver.
    years: Object.entries(dirs.archive?.by_year || {})
      .filter(([year]) => year !== '0000')
      .map(([year, count]) => ({ key: year, label: year, count }))
      .sort((a, b) => Number(a.key) - Number(b.key)),
    extensions: countExtensions(dirs),
    kinds: countKinds(dirs),
  }
}

function countExtensions(dirs) {
  const totals = {}
  for (const d of Object.values(dirs)) {
    for (const [ext, n] of Object.entries(d.by_extension || {})) {
      totals[ext] = (totals[ext] || 0) + n
    }
  }
  return Object.entries(totals)
    .map(([ext, count]) => ({ key: ext, label: ext, count }))
    .sort((a, b) => b.count - a.count)
}

function countKinds(dirs) {
  const totals = {}
  for (const d of Object.values(dirs)) {
    for (const [kind, n] of Object.entries(d.by_kind || {})) {
      totals[kind] = (totals[kind] || 0) + n
    }
  }
  return Object.entries(totals)
}

/** How mm archive would treat the files it has not indexed yet. */
export const READINESS = [
  {
    key: 'ready', label: 'Ready', tone: 'good', cta: 'Ingest', flags: '',
    desc: 'Has both a date and a location. Goes in with strict defaults.',
  },
  {
    key: 'needs_no_gps', label: 'No location', tone: 'warn', cta: 'Ingest', flags: '--allow-no-gps',
    desc: 'Dated, but nothing says where. Needs --allow-no-gps to be accepted.',
  },
  {
    key: 'needs_no_date', label: 'No confident date', tone: 'warn', cta: 'Ingest', flags: '--allow-no-date',
    desc: 'Located, but the date is a guess. Needs --allow-no-date to be accepted.',
  },
  {
    key: 'video', label: 'Videos', tone: 'info', cta: 'Ingest', flags: '',
    desc: 'Not photographs. Same mm archive command handles them.',
  },
  {
    key: 'hopeless', label: 'Nothing to go on', tone: 'bad', cta: null, flags: '',
    desc: 'No date, no location. Somebody has to say when and where before these can be kept.',
  },
  {
    key: 'unreadable', label: 'Unreadable', tone: 'bad', cta: null, flags: '',
    desc: 'The file would not open. Most likely corrupt.',
  },
]

export const TONES = {
  good: { bg: '#e6f4ea', fg: '#137333' },
  warn: { bg: '#fef7e0', fg: '#a15c00' },
  info: { bg: '#e8f0fe', fg: '#0b57d0' },
  bad: { bg: '#fce8e6', fg: '#c5221f' },
}
