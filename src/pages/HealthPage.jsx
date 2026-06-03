import { useEffect, useState } from 'react'
import { Container } from '../components/Container'
import {
  StatTile, StatSection, ExpandableSection, BarBucketBody,
} from '../components/admin/Primitives'
import { CodeBlock } from '../components/admin/CodeBlock'
import { Button } from '../components/Button'
import { fmt, bytes, relTime } from '../components/admin/format'
import { thumbUrl } from '../lib/media'

// /admin/health — "Is the pipeline keeping up?"
// Filesystem-side reality check. Drift vs Neo4j, sidecar coverage per
// pipeline, disk inventory. Counterpart to /admin/analytics which is
// "what's in the archive" (Neo4j-only).

export function HealthPage() {
  const [disk, setDisk] = useState(null)
  const [error, setError] = useState(null)
  const [showAllYears, setShowAllYears] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [inspect, setInspect] = useState(null)  // bucket descriptor for the Inspect modal

  useEffect(() => {
    fetch('/api/admin/disk-report')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setDisk)
      .catch(e => setError(String(e)))
  }, [])

  async function refresh() {
    setRefreshing(true)
    try {
      await fetch('/api/admin/disk-report/refresh', { method: 'POST' })
      const r = await fetch('/api/admin/disk-report')
      if (r.ok) setDisk(await r.json())
    } finally {
      setRefreshing(false)
    }
  }

  if (error) return <Container className="py-6"><p className="text-[13px] text-red-400">Failed: {error}</p></Container>
  if (!disk) return <Container className="py-6"><p className="text-[13px] text-white/30">Loading…</p></Container>

  const drift = disk.drift || {}
  const onDiskNotInGraph = drift.on_disk_not_in_graph?.count ?? 0
  const inGraphNotOnDisk = drift.in_graph_not_on_disk?.count ?? 0
  const dirs = disk.directories || {}
  const totalBytes = Object.values(dirs).reduce((a, d) => a + (d.media_bytes || 0), 0)

  // Year buckets from archive only (heritage / staging don't have year breakdown
  // worth charting). Convert to ranked list for the bar chart.
  const archiveYears = Object.entries(dirs.archive?.by_year || {})
    .filter(([year]) => year !== '0000')
    .map(([year, count]) => ({ key: year, label: year, count }))
    .sort((a, b) => Number(a.key) - Number(b.key))
  // Aggregate file extensions across all dirs.
  const extTotals = {}
  for (const d of Object.values(dirs)) {
    for (const [ext, n] of Object.entries(d.by_extension || {})) {
      extTotals[ext] = (extTotals[ext] || 0) + n
    }
  }
  const extBuckets = Object.entries(extTotals)
    .map(([ext, count]) => ({ key: ext, label: ext, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <Container className="space-y-6 py-6">
      <div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-white md:text-2xl">Health</h1>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
            filesystem
          </span>
          <span className="text-[10px] italic text-white/35">{relTime(disk.generated)}</span>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="ml-auto text-[10px] uppercase tracking-wider text-white/50 underline decoration-white/15 underline-offset-2 hover:text-white disabled:opacity-40"
          >
            {refreshing ? 'rescanning…' : 'rescan'}
          </button>
        </div>
        <p className="mt-2 text-[12px] text-white/40">
          Disk-side reality check — walks <code className="rounded bg-white/5 px-1 text-stone-300">{disk.photos_root}</code> and
          cross-references with Neo4j Media paths. Scan duration: {disk.duration_seconds?.toFixed(1)}s.
        </p>
      </div>

      {(() => {
        // "Production" = archive + heritage. Staging is a workspace, not
        // a system-of-record; its unindexed files are by-design backlog,
        // so we pull it out of the strict drift comparison.
        const PROD_ROOTS = ['archive', 'heritage']
        const unindexedByRoot = drift.on_disk_not_in_graph?.by_root || {}
        const staleByRoot     = drift.in_graph_not_on_disk?.by_root || {}

        const prodOnDisk  = PROD_ROOTS.reduce((a, r) => a + (dirs[r]?.media_total || 0), 0)
        const prodInGraph = PROD_ROOTS.reduce((a, r) => a + (dirs[r]?.graph_total || 0), 0)
        const prodUnindexed = PROD_ROOTS.reduce((a, r) => a + (unindexedByRoot[r] || 0), 0)
        const prodStale     = PROD_ROOTS.reduce((a, r) => a + (staleByRoot[r]     || 0), 0)
        const prodInSync  = Math.min(prodOnDisk, prodInGraph) - prodStale
        const prodSyncPct = prodOnDisk ? (prodInSync / prodOnDisk) * 100 : 0
        const prodMissing = prodUnindexed + prodStale
        const hasProdIssues = prodMissing > 0

        const stagingOnDisk  = dirs.staging?.media_total || 0
        const stagingInGraph = dirs.staging?.graph_total || 0
        return (
          <>
            {/* Act 1 — what is. Production = archive + heritage only. */}
            <section>
              <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Production health</h2>
                <span className="text-[11px] text-white/30">archive + heritage · should always sync</span>
              </div>
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/8 bg-white/3">
                <div className="divide-y divide-white/8 border-r border-white/8">
                  <div className="flex flex-col items-center justify-center gap-1 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-white/35">Accounted for</div>
                    <div className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">{fmt(prodInGraph)}</div>
                    <div className="text-[10px] text-white/35">tracked in the app</div>
                  </div>
                  <div className="relative">
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-stone-950 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/45">
                      vs
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 p-4">
                      <div className="text-[10px] uppercase tracking-wider text-white/35">On disk</div>
                      <div className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">{fmt(prodOnDisk)}</div>
                      <div className="text-[10px] text-white/35">in archive + heritage</div>
                    </div>
                  </div>
                </div>
                {(() => {
                  const tone = prodSyncPct >= 98 ? 'text-emerald-300'
                            : prodSyncPct >= 90 ? 'text-amber-300'
                            : 'text-rose-300'
                  return (
                    <div className="flex flex-col items-center justify-center gap-1 p-4">
                      <div className="text-[10px] uppercase tracking-wider text-white/35">In sync</div>
                      <div className={`text-3xl font-bold tabular-nums sm:text-5xl ${tone}`}>{prodSyncPct.toFixed(1)}%</div>
                      <div className="text-[12px] font-medium text-white/55 sm:text-sm">
                        {prodMissing > 0 ? `${fmt(prodMissing)} files missing` : 'all files matched'}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </section>

            {/* Unindexed files — neutral, informational, per-bucket CTAs. */}
            {prodUnindexed > 0 && (() => {
              const r = drift.on_disk_not_in_graph?.readiness || {}
              const BUCKETS = [
                { key: 'ready',         label: 'Ready',        tone: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200', desc: 'Has both GPS and date. Will ingest with strict defaults.',                       cta: 'Ingest', flags: '' },
                { key: 'needs_no_gps',  label: 'Missing GPS',  tone: 'border-amber-500/40 bg-amber-500/15 text-amber-200',       desc: 'Has date but no GPS. Needs --allow-no-gps to accept.',                          cta: 'Ingest', flags: '--allow-no-gps' },
                { key: 'needs_no_date', label: 'Missing date', tone: 'border-amber-500/40 bg-amber-500/15 text-amber-200',       desc: 'Has GPS but low date confidence. Needs --allow-no-date to accept.',             cta: 'Ingest', flags: '--allow-no-date' },
                { key: 'video',         label: 'Videos',       tone: 'border-sky-500/40 bg-sky-500/15 text-sky-200',             desc: 'Non-image media. Has its own ingest path; same mm archive command handles them.', cta: 'Ingest', flags: '' },
                { key: 'hopeless',      label: 'No EXIF data', tone: 'border-rose-500/40 bg-rose-500/15 text-rose-200',          desc: 'No GPS, no date. Needs a manual EXIF fix before any ingest will keep them.',     cta: null,     flags: '' },
                { key: 'unreadable',    label: 'Unreadable',   tone: 'border-rose-500/40 bg-rose-500/15 text-rose-200',          desc: 'Pillow could not open the file or parse EXIF. Likely corrupt.',                  cta: null,     flags: '' },
              ]
              return (
                <section>
                  <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Unindexed files</h2>
                    <span className="text-[11px] text-white/30">
                      {fmt(prodUnindexed)} on disk, not in graph · grouped by what mm archive would do
                    </span>
                  </div>

                  <div className="space-y-2">
                    {BUCKETS.filter(b => (r[b.key] || 0) > 0).map(b => {
                      const n = r[b.key]
                      return (
                        <button
                          key={b.key}
                          type="button"
                          onClick={() => setInspect({ ...b, count: n })}
                          className="block w-full rounded-lg border border-white/8 bg-white/3 p-3 text-left transition-colors hover:border-white/20 hover:bg-white/8"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${b.tone}`}>{b.label}</span>
                            <span className="text-[12px] tabular-nums text-white/40">{fmt(n)}</span>
                          </div>
                          <p className="mt-2 text-[12px] text-white/55">{b.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })()}

            {/* Stale records — same card-clickable pattern as unindexed. */}
            {prodStale > 0 && (
              <section>
                <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Stale records</h2>
                  <span className="text-[11px] text-white/30">graph points at files no longer on disk</span>
                </div>
                <button
                  type="button"
                  onClick={() => setInspect({
                    kind:  'drop',
                    key:   'stale',
                    label: 'Stale records',
                    tone:  'border-rose-500/40 bg-rose-500/15 text-rose-200',
                    desc:  'Graph points at files that no longer exist on disk. Clicking these will 404 in the gallery.',
                    count: prodStale,
                    flags: '',
                  })}
                  className="block w-full rounded-lg border border-white/8 bg-white/3 p-3 text-left transition-colors hover:border-white/20 hover:bg-white/8"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-200">Stale records</span>
                    <span className="text-[12px] tabular-nums text-white/40">{fmt(prodStale)}</span>
                  </div>
                  <p className="mt-2 text-[12px] text-white/55">
                    Graph points at files that no longer exist on disk. Clicking these will 404 in the gallery.
                  </p>
                </button>
              </section>
            )}

            {/* Staging — workspace, not a system-of-record. No alarm tone. */}
            {stagingOnDisk > 0 && (
              <section>
                <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Staging</h2>
                  <span className="text-[11px] text-white/30">workspace — files waiting for triage</span>
                </div>
                <div className="rounded-lg border border-white/8 bg-white/3 p-4">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <div className="text-2xl font-semibold tabular-nums text-white">{fmt(stagingOnDisk)}</div>
                    <div className="text-[12px] text-white/55">files in Staging</div>
                    {stagingInGraph > 0 && (
                      <div className="ml-auto text-[11px] text-white/35">{fmt(stagingInGraph)} already indexed</div>
                    )}
                  </div>
                  <p className="mt-2 text-[12px] text-white/45">
                    Staging is a workspace — unindexed files here are by-design backlog awaiting human triage,
                    not drift. Move them to Archive when ready.
                  </p>
                </div>
              </section>
            )}
          </>
        )
      })()}

      <StatSection title="Top-level directories" subtitle="what lives under /photos" cols="three">
        {Object.entries(dirs).map(([name, d]) => (
          <StatTile
            key={name}
            label={name}
            value={fmt(d.media_total)}
            sub={`${bytes(d.media_bytes)} · ${bytes(d.sidecar_bytes)} sidecars`}
          />
        ))}
      </StatSection>

      <StatSection title="By file kind" subtitle="across all directories" cols="three">
        {(() => {
          const totals = { image: 0, video: 0, audio: 0 }
          for (const d of Object.values(dirs)) {
            for (const [k, v] of Object.entries(d.by_kind || {})) {
              totals[k] = (totals[k] || 0) + v
            }
          }
          return Object.entries(totals).map(([k, v]) => (
            <StatTile key={k} label={k} value={fmt(v)} />
          ))
        })()}
      </StatSection>

      <ExpandableSection
        title="By file extension"
        collapsedSubtitle="top 3 across all directories"
        expandedSubtitle={`all ${extBuckets.length} extensions · sorted by count`}
        expanded={showAllYears}
        onToggle={() => setShowAllYears(v => !v)}
        collapsed={
          <div className="grid grid-cols-3 gap-2">
            {extBuckets.slice(0, 3).map(b => (
              <StatTile key={b.key} label={b.label} value={fmt(b.count)} />
            ))}
          </div>
        }
        expandedContent={<BarBucketBody buckets={extBuckets} />}
      />

      {archiveYears.length > 0 && (
        <section>
          <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">By year</h2>
            <span className="text-[11px] text-white/30">archive only · disk count</span>
          </div>
          <BarBucketBody buckets={archiveYears} />
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Sample unindexed paths</h2>
          <span className="text-[11px] text-white/30">first 10 — need ingest</span>
        </div>
        <div className="space-y-0.5 rounded border border-white/8 bg-white/3 p-3 font-mono text-[11px] text-white/55">
          {(drift.on_disk_not_in_graph?.samples || []).slice(0, 10).map((p, i) => (
            <div key={i} className="truncate">{p}</div>
          ))}
        </div>
      </section>

      <div className="text-[10px] text-white/25">
        Total bytes across all dirs: {bytes(totalBytes)} ({fmt(disk.duration_seconds)}s scan)
      </div>

      <InspectBucketModal
        bucket={inspect}
        unindexedSamples={drift.on_disk_not_in_graph?.samples || []}
        unindexedByRoot={drift.on_disk_not_in_graph?.by_root || {}}
        staleSamples={drift.in_graph_not_on_disk?.samples || []}
        staleByRoot={drift.in_graph_not_on_disk?.by_root || {}}
        onClose={() => setInspect(null)}
      />
    </Container>
  )
}


function InspectBucketModal({ bucket, unindexedSamples, unindexedByRoot, staleSamples, staleByRoot, onClose }) {
  // Lock body scroll + wire ESC while the modal is open. Restoring the
  // original overflow on cleanup is important — otherwise a quick open /
  // close cycle can leave the page unscrollable.
  useEffect(() => {
    if (!bucket) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [bucket, onClose])

  if (!bucket) return null

  const isDrop = bucket.kind === 'drop'
  const samples = isDrop ? staleSamples : unindexedSamples
  const byRoot  = isDrop ? staleByRoot  : unindexedByRoot
  const cmd = isDrop
    ? `cd /home/stephen/Documents/ourkin/api

# 1. Preview only — print what would be deleted, no changes
venv/bin/python scripts/cleanup_stale_media.py --dry-run

# 2. Apply for real — drops the listed Media nodes + their rels
venv/bin/python scripts/cleanup_stale_media.py --apply`
    : `cd /home/stephen/Documents/ourkin/workshop

# 1. Preview only — see what would move, no changes made
mm archive /photos/staging/ -r --dry-run ${bucket.flags}

# 2. Limit to first 100 files for a smoke test
mm archive /photos/staging/ -r -l 100 --dry-run ${bucket.flags}

# 3. Real run, ${bucket.flags ? `accepts ${bucket.flags}` : 'strict defaults'}
mm archive /photos/staging/ -r -w 6 ${bucket.flags}`.trimEnd()
  const PROD_ROOTS = ['archive', 'heritage']
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-stone-950 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-base font-semibold text-white">{bucket.label}</h2>
            <span className="text-[12px] tabular-nums text-white/45">{bucket.count.toLocaleString()} files</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(90vh-3.5rem)] space-y-4 overflow-y-auto p-5 pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="text-[13px] text-white/75">{bucket.desc}</p>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">Where they live</div>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {PROD_ROOTS
                .map(root => ({ root, n: byRoot[root] || 0 }))
                .filter(({ n }) => n > 0)
                .map(({ root, n }) => (
                  <div key={root} className="rounded border border-white/8 bg-white/3 px-3 py-2 text-center">
                    <div className="text-[11px] capitalize text-white/55">{root}</div>
                    <div className="text-base font-semibold tabular-nums text-white">{n.toLocaleString()}</div>
                  </div>
                ))}
            </div>
          </div>

          {isDrop ? (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">What this does</div>
                <p className="mt-1 text-[12px] text-white/65">
                  For each Media node whose <code className="rounded bg-white/5 px-1 text-stone-300">m.path</code> no longer exists on disk,
                  the script deletes the node and all its relationships (APPEARS_IN, FAVORITED, MEMBER_OF, etc.) from Neo4j.
                </p>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">Risks</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[12px] text-white/65">
                  <li><strong className="text-rose-200/90">Destructive — graph data is removed.</strong> Face assignments, album memberships, manual redates etc. on these records go with them.</li>
                  <li>If the file was moved (not deleted), drop&shy;ping the record loses history. Better to fix the move first via re-ingest.</li>
                  <li><strong className="text-rose-200/90">Always run with <code className="rounded bg-white/5 px-1 text-stone-300">--dry-run</code> first</strong> and review the affected paths.</li>
                  <li>Cleanup script <em>does not exist yet</em> — placeholder shown below.</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">What mm archive does</div>
                <p className="mt-1 text-[12px] text-white/65">
                  Reads EXIF date, renames to <code className="rounded bg-white/5 px-1 text-stone-300">YYYY-MM-DD_HH-MM-SS_###.ext</code>,
                  moves the file to <code className="rounded bg-white/5 px-1 text-stone-300">/photos/archive/YYYY/MM/</code>, then
                  runs mpp to extract metadata and write the sidecar.
                </p>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">Risks</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[12px] text-white/65">
                  <li>Files <strong className="text-white/85">are moved</strong>, not copied — source location changes.</li>
                  <li>Heritage scans (EXIF "scanned from original") need <code className="rounded bg-white/5 px-1 text-stone-300">--heritage</code> for interactive context prompts; otherwise skipped.</li>
                  <li><strong className="text-white/85">Always preview with <code className="rounded bg-white/5 px-1 text-stone-300">--dry-run</code> first</strong> before applying.</li>
                </ul>
              </div>
            </>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">Manual command</div>
            <div className="mt-1">
              <CodeBlock language="bash" code={cmd} />
            </div>
          </div>

          {samples.length > 0 && (
            <div>
              {!isDrop && (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Sample previews</div>
                  <div className="mt-1 grid grid-cols-4 gap-1 sm:grid-cols-6 md:grid-cols-8">
                    {samples.slice(0, 16).map((p, i) => (
                      <div key={i} className="group relative aspect-square overflow-hidden rounded border border-white/8 bg-black/30">
                        <img
                          src={thumbUrl(p)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          onError={e => { e.currentTarget.style.display = 'none' }}
                          title={p}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
              <details className={`cursor-pointer ${isDrop ? '' : 'mt-2'}`}>
                <summary className="text-[10px] uppercase tracking-wider text-white/40 hover:text-white/70">Sample paths</summary>
                <div className="mt-1 max-h-48 space-y-0.5 overflow-y-auto rounded bg-black/30 p-2 font-mono text-[10px] text-white/55 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {samples.slice(0, 25).map((p, i) => (
                    <div key={i} className="truncate">{p}</div>
                  ))}
                </div>
              </details>
              {!isDrop && (
                <div className="mt-1 text-[10px] text-white/30">Samples are from all unindexed files (not just this bucket). Some videos/unreadable files won't render.</div>
              )}
            </div>
          )}

          {(bucket.cta || isDrop) && (
            <div className="flex items-center justify-end gap-2 border-t border-white/8 pt-4">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                variant={isDrop ? 'danger' : 'primary'}
                size="sm"
                onClick={() => {}}
                title={isDrop ? 'not wired — would drop stale Media nodes from Neo4j' : `not wired — would run: mm archive ... ${bucket.flags}`}
              >
                {isDrop ? 'Drop' : bucket.cta} {bucket.count.toLocaleString()} {isDrop ? 'records' : 'files'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
