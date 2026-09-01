import { useState, useEffect, useMemo } from 'react'

function fmt(n) {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

function pctColor(p) {
  if (p == null) return 'text-white/20'
  if (p >= 99)   return 'text-emerald-400'
  if (p >= 95)   return 'text-green-400'
  if (p >= 80)   return 'text-yellow-400'
  if (p > 0)     return 'text-orange-400'
  return 'text-red-400'
}

function PctBar({ pct }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] tabular-nums w-10 text-right ${pctColor(pct)}`}>{pct.toFixed(1)}%</span>
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-lg p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${accent || 'text-white'}`}>{value}</div>
      {sub && <div className="text-[11px] text-white/30 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Coverage ──────────────────────────────────────────────────────────────────

const COVERAGE_FIELDS = ['mpp','objects','clip','scenes','md5','perceptual','gps','geo','landmarks']
const FIELD_LABELS    = { mpp:'Sidecar (mpp)', objects:'Objects', clip:'CLIP', scenes:'Scenes (DINOv2)', md5:'MD5', perceptual:'Perceptual Hash', gps:'GPS', geo:'Geocoded', landmarks:'Landmarks' }

function CoverageSection({ coverage }) {
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-3">Coverage</h2>
      <div className="overflow-x-auto rounded-lg border border-white/8 bg-white/3">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-white/8">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Field</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-white/30">Images</th>
              <th className="w-36 px-4 py-2.5"></th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-white/30">Videos</th>
              <th className="w-36 px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {COVERAGE_FIELDS.map(field => {
              const img = coverage.images?.[field]
              const vid = coverage.videos?.[field]
              return (
                <tr key={field} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                  <td className="px-4 py-2.5 text-[12px] text-white/60">{FIELD_LABELS[field]}</td>
                  <td className="px-4 py-2.5 text-right text-[12px] tabular-nums text-white/50">{img ? fmt(img.count) : '—'}</td>
                  <td className="w-36 px-4 py-2.5">{img ? <PctBar pct={img.pct} /> : null}</td>
                  <td className="px-4 py-2.5 text-right text-[12px] tabular-nums text-white/50">{vid ? fmt(vid.count) : '—'}</td>
                  <td className="w-36 px-4 py-2.5">{vid ? <PctBar pct={vid.pct} /> : null}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Issues ────────────────────────────────────────────────────────────────────

function IssuesSection({ issues }) {
  const items = [
    { label: 'Corrupted',        count: issues.corrupted,          warn: issues.corrupted > 0 },
    { label: 'Missing sidecar',  count: issues.missing_mpp,        warn: issues.missing_mpp > 0 },
    { label: 'Missing objects',  count: issues.missing_objects },
    { label: 'Missing CLIP',     count: issues.missing_clip },
    { label: 'Missing scenes',   count: issues.missing_scenes },
    { label: 'Missing MD5',      count: issues.missing_md5,        warn: issues.missing_md5 > 0 },
    { label: 'Missing phash',    count: issues.missing_perceptual, warn: issues.missing_perceptual > 0 },
    { label: 'No GPS',           count: issues.no_gps },
    { label: 'GPS unresolved',   count: issues.gps_not_resolved },
  ]
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-3">Issues</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map(({ label, count, warn }) => (
          <div key={label} className="bg-white/3 border border-white/8 rounded-lg px-3 py-2.5 flex justify-between items-center">
            <span className="text-[12px] text-white/40">{label}</span>
            <span className={`text-[18px] font-bold tabular-nums ${count === 0 ? 'text-emerald-400' : warn ? 'text-red-400' : 'text-yellow-400'}`}>
              {fmt(count)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Processors ────────────────────────────────────────────────────────────────

const PROC_COLORS = { ImageProcessor: '#3b82f6', VideoProcessor: '#a855f7', HeritageProcessor: '#f59e0b' }

function ProcessorsSection({ processors }) {
  const total = Object.values(processors).reduce((a, b) => a + b, 0)
  const entries = Object.entries(processors).sort((a, b) => b[1] - a[1])
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-3">Processors</h2>
      <div className="space-y-3 rounded-lg border border-white/8 bg-white/3 p-4">
        {entries.map(([name, count]) => {
          const pct = (count / total) * 100
          const color = PROC_COLORS[name] || '#6b7280'
          return (
            <div key={name} className="flex flex-col gap-1 sm:grid sm:grid-cols-[160px_1fr_80px] sm:items-center sm:gap-3">
              <span className="text-[12px] text-white/50">{name}</span>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="text-[12px] tabular-nums text-white/60 sm:text-right">{fmt(count)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Heritage ──────────────────────────────────────────────────────────────────

function HeritageSection({ heritage }) {
  const items = [
    { label: 'Total',          value: fmt(heritage.total), pct: null },
    { label: 'With context',   ...heritage.with_context },
    { label: 'With people',    ...heritage.with_people },
    { label: 'Content date',   ...heritage.with_content_date },
    { label: 'Related items',  ...heritage.with_related },
    { label: 'Physical desc',  ...heritage.with_physical },
    { label: 'Transcribed',    ...heritage.with_transcription },
  ]
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-3">
        Heritage — {fmt(heritage.total)} files
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {items.map(({ label, value, pct, count }) => (
          <div key={label} className="bg-white/3 border border-white/8 rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</div>
            {pct != null ? (
              <>
                <div className={`text-2xl font-bold mt-1 ${pctColor(pct)}`}>{pct.toFixed(1)}%</div>
                <div className="text-[11px] text-white/30 mt-0.5">{fmt(count)}</div>
              </>
            ) : (
              <div className="text-2xl font-bold mt-1 text-white">{value}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Faces ─────────────────────────────────────────────────────────────────────

function FacesSection({ faces }) {
  const img = faces.images || {}
  const vid = faces.videos || {}
  const cl  = faces.clusters || {}
  const unassigned = (cl.cluster_count || 0) - (cl.assigned_count || 0)
  return (
    <section>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/30">Face Detection</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <StatCard label="Images scanned"   value={`${fmt(img.scanned)} / ${fmt(img.eligible)}`}   sub={`${img.eligible > 0 ? ((img.scanned/img.eligible)*100).toFixed(1) : 0}% of eligible`} />
        <StatCard label="Videos scanned"   value={`${fmt(vid.scanned)} / ${fmt(vid.eligible)}`}   sub={`${vid.eligible > 0 ? ((vid.scanned/vid.eligible)*100).toFixed(1) : 0}% of eligible`} />
        <StatCard label="Faces in images"  value={fmt(img.total_detected)} sub={`${fmt(img.with_2plus)} multi-face images`} />
        <StatCard label="Faces in videos"  value={fmt(vid.total_detected)} />
        <StatCard label="Clusters"         value={fmt(cl.cluster_count)}   sub={`${fmt(cl.total_clustered_faces)} faces`} />
        <StatCard label="Assigned"         value={fmt(cl.assigned_count)}  accent="text-emerald-400" sub={`${fmt(unassigned)} unassigned`} />
        <StatCard label="Noise faces"      value={fmt(cl.noise_faces)}     accent="text-yellow-400" sub={`${fmt(cl.noise_subclusters)} sub-clusters`} />
        <StatCard label="Skipped"          value={fmt(cl.skipped_faces)}   sub="face identities" />
      </div>
    </section>
  )
}

// ── People ────────────────────────────────────────────────────────────────────

function PeopleSection({ people }) {
  const [sortKey, setSortKey] = useState('total')
  const [sortAsc, setSortAsc] = useState(false)

  const rows = useMemo(() => {
    const withTotal = (people.top_people || []).map(p => ({ ...p, total: p.gallery_faces + p.cluster_faces }))
    return [...withTotal].sort((a, b) => {
      const av = a[sortKey] ?? (sortKey === 'name' ? '' : 0)
      const bv = b[sortKey] ?? (sortKey === 'name' ? '' : 0)
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortAsc ? av - bv : bv - av
    })
  }, [people.top_people, sortKey, sortAsc])

  function toggleSort(key) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(key === 'name') }
  }

  const cols = [
    { key: 'name',          label: 'Name',        align: 'left'  },
    { key: 'gallery_faces', label: 'Gallery',      align: 'right' },
    { key: 'cluster_faces', label: 'In clusters',  align: 'right' },
    { key: 'total',         label: 'Total',        align: 'right' },
  ]

  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-3">
        People — {fmt(people.total)} records
      </h2>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatCard label="People records"  value={fmt(people.total)}                sub={`${fmt(people.with_gallery)} with face gallery`} />
        <StatCard label="Gallery entries" value={fmt(people.total_gallery_faces)}  sub="total face references" />
      </div>
      <div className="overflow-auto rounded-lg border border-white/8 max-h-80">
        <table className="w-full min-w-[480px] border-collapse">
          <thead className="sticky top-0 bg-[#0d0d0d] z-10">
            <tr className="border-b border-white/8">
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-white/60 transition-colors ${col.align === 'right' ? 'text-right' : 'text-left'} ${sortKey === col.key ? 'text-blue-400' : 'text-white/25'}`}
                >
                  {col.label}{sortKey === col.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.name} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                <td className="px-3 py-1.5 text-[12px] text-white/70">{p.name}</td>
                <td className="px-3 py-1.5 text-right text-[12px] tabular-nums text-white/50">{fmt(p.gallery_faces)}</td>
                <td className="px-3 py-1.5 text-right text-[12px] tabular-nums text-white/50">{fmt(p.cluster_faces)}</td>
                <td className="px-3 py-1.5 text-right text-[12px] tabular-nums font-semibold text-white/80">{fmt(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Extensions ────────────────────────────────────────────────────────────────

function ExtensionsSection({ extensions }) {
  const total   = Object.values(extensions).reduce((a, b) => a + b, 0)
  const entries = Object.entries(extensions).sort((a, b) => b[1] - a[1])
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-3">File Types</h2>
      <div className="space-y-2.5 rounded-lg border border-white/8 bg-white/3 p-4">
        {entries.map(([ext, count]) => {
          const pct = (count / total) * 100
          return (
            <div key={ext} className="grid grid-cols-[60px_1fr_70px] items-center gap-3 sm:grid-cols-[80px_1fr_80px]">
              <span className="font-mono text-[12px] text-white/50">.{ext}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-blue-500/70 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-right text-[12px] tabular-nums text-white/50">{fmt(count)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Directory table ───────────────────────────────────────────────────────────

function pctOf(row, field) {
  if (!row.total) return null
  if (row[field] == null) return null
  return (row[field] / row.total) * 100
}

function overallPct(row) {
  if (!row.total) return null
  const vals = ['mpp','objects','clip','md5','perceptual'].map(f => pctOf(row, f)).filter(v => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

const DIR_COLS = [
  { key: 'path',       label: 'Path',     align: 'left',  pct: false },
  { key: 'total',      label: 'Files',    align: 'right', pct: false },
  { key: 'overall',    label: 'Overall',  align: 'right', pct: true  },
  { key: 'mpp',        label: 'mpp%',     align: 'right', pct: true  },
  { key: 'objects',    label: 'obj%',     align: 'right', pct: true  },
  { key: 'clip',       label: 'clip%',    align: 'right', pct: true  },
  { key: 'md5',        label: 'md5%',     align: 'right', pct: true  },
  { key: 'perceptual', label: 'phash%',   align: 'right', pct: true  },
  { key: 'gps',        label: 'gps%',     align: 'right', pct: true, dim: true },
  { key: 'geo',        label: 'geo%',     align: 'right', pct: true, dim: true },
]

const FILTER_MODES = [
  { key: 'all',            label: 'All' },
  { key: 'issues',         label: 'Has issues' },
  { key: 'incomplete_obj', label: 'Missing obj/clip' },
  { key: 'no_gps',         label: 'Low GPS' },
]

function DirsSection({ byDir }) {
  const [filter, setFilter]   = useState('')
  const [mode, setMode]       = useState('all')
  const [sortKey, setSortKey] = useState('total')
  const [sortAsc, setSortAsc] = useState(false)

  const rows = useMemo(() => {
    let result = byDir
    if (filter) result = result.filter(d => d.path.includes(filter))
    if (mode === 'issues')
      result = result.filter(r => r.total > 0 && (['objects','clip','md5','gps'].some(f => r[f] != null && (r[f]/r.total) < 1) || r.mpp < r.total))
    else if (mode === 'incomplete_obj')
      result = result.filter(r => r.total > 0 && r.objects < r.total)
    else if (mode === 'no_gps')
      result = result.filter(r => r.total > 0 && (r.gps / r.total) < 0.5)

    return [...result].sort((a, b) => {
      let av, bv
      if (sortKey === 'path')    { av = a.path; bv = b.path }
      else if (sortKey === 'total')   { av = a.total ?? -1; bv = b.total ?? -1 }
      else if (sortKey === 'overall') { av = overallPct(a) ?? -1; bv = overallPct(b) ?? -1 }
      else { av = pctOf(a, sortKey) ?? -1; bv = pctOf(b, sortKey) ?? -1 }
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortAsc ? av - bv : bv - av
    })
  }, [byDir, filter, mode, sortKey, sortAsc])

  function toggleSort(key) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(key === 'path') }
  }

  function cellValue(row, col) {
    if (col.key === 'path')    return { val: row.path, isStr: true }
    if (col.key === 'total')   return { val: fmt(row.total), num: row.total }
    if (col.key === 'overall') return { val: overallPct(row), isPct: true, bold: true }
    if (col.pct)               return { val: pctOf(row, col.key), isPct: true }
    return { val: '—' }
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/30">By Directory</h2>
        <div className="flex flex-wrap gap-1">
          {FILTER_MODES.map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`rounded border px-2.5 py-1 text-[11px] transition-colors ${mode === m.key ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/60'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter path…"
          className="w-full min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[12px] text-white placeholder-white/20 outline-none focus:border-white/25 sm:w-28 sm:flex-none"
        />
        <span className="ml-auto text-[11px] text-white/20">{rows.length} / {byDir.length} dirs</span>
      </div>
      <div className="overflow-auto rounded-lg border border-white/8 max-h-[500px]">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="sticky top-0 bg-[#0d0d0d] z-10">
            <tr className="border-b border-white/8">
              {DIR_COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-white/60 transition-colors ${col.align === 'right' ? 'text-right' : 'text-left'} ${sortKey === col.key ? 'text-blue-400' : col.dim ? 'text-white/15' : 'text-white/25'}`}
                >
                  {col.label}{sortKey === col.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(d => (
              <tr key={d.path} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                {DIR_COLS.map(col => {
                  const { val, isPct, isStr, bold, num } = cellValue(d, col)
                  if (isStr) return <td key={col.key} className="px-3 py-1.5 font-mono text-[12px] text-white/60">{val}</td>
                  if (isPct) {
                    if (val == null) return <td key={col.key} className="px-3 py-1.5 text-right text-[12px] text-white/15">—</td>
                    return <td key={col.key} className={`px-3 py-1.5 text-right text-[12px] tabular-nums ${bold ? 'font-bold' : ''} ${pctColor(val)}`}>{val.toFixed(0)}%</td>
                  }
                  return <td key={col.key} className="px-3 py-1.5 text-right text-[12px] tabular-nums text-white/70">{val}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}


// ── Scene embeddings ──────────────────────────────────────────────────────────

// DINOv2 embeddings are what place/structure similarity runs on. The headline
// number is coverage, but the one that bites is `mixed_models`: embeddings from
// different DINOv2 variants have different dimensions and are not comparable,
// so a mixed archive silently fails to match across the split.
function ScenesSection({ scenes }) {
  const models = Object.entries(scenes.models || {})
  const dims   = Object.entries(scenes.dims || {})
  return (
    <section>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/30">Scene Embeddings (DINOv2)</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Embedded" value={fmt(scenes.total)} sub={`${scenes.pct ?? '—'}% of ${fmt(scenes.eligible)} eligible`} />
        <StatCard label="Images"   value={fmt(scenes.images)} />
        <StatCard label="Videos"   value={fmt(scenes.videos)} />
      </div>
      {scenes.mixed_models && (
        <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/8 px-3 py-2.5">
          <span className="text-[12px] text-yellow-300">
            Mixed models — embeddings from different DINOv2 variants are not comparable to each other.
          </span>
        </div>
      )}
      {(models.length > 0 || dims.length > 0) && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {models.length > 0 && (
            <div className="rounded-lg border border-white/8 bg-white/3 p-3">
              <div className="mb-2 text-[11px] uppercase tracking-wider text-white/30">Model</div>
              {models.map(([name, count]) => (
                <div key={name} className="flex justify-between py-0.5 text-[12px]">
                  <span className="text-white/60">{name}</span>
                  <span className="tabular-nums text-white/40">{fmt(count)}</span>
                </div>
              ))}
            </div>
          )}
          {dims.length > 0 && (
            <div className="rounded-lg border border-white/8 bg-white/3 p-3">
              <div className="mb-2 text-[11px] uppercase tracking-wider text-white/30">Dimensions</div>
              {dims.map(([dim, count]) => (
                <div key={dim} className="flex justify-between py-0.5 text-[12px]">
                  <span className="text-white/60">{dim}-d</span>
                  <span className="tabular-nums text-white/40">{fmt(count)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminOverviewPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetch('/api/admin/report')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-white/30 text-sm">Loading…</div>
  if (error)   return <div className="p-8 text-red-400 text-sm">Failed: {error} — run the "Archive Report" job first.</div>

  const { totals, coverage, issues, extensions, processors, heritage, faces, scenes, people, by_dir, generated } = data

  return (
    <div className="max-w-6xl space-y-8 p-4 md:p-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold text-white md:text-2xl">Archive Overview</h1>
        <span className="text-[12px] text-white/25">Generated {new Date(generated).toLocaleString()}</span>
      </div>

      {/* Summary */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/30">Summary</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Total media" value={`${(totals.total/1000).toFixed(1)}k`}  sub={`${fmt(totals.total)} files`} />
          <StatCard label="Images"      value={`${(totals.images/1000).toFixed(1)}k`} sub={`${fmt(totals.images)} files`} />
          <StatCard label="Videos"      value={`${(totals.videos/1000).toFixed(1)}k`} sub={`${fmt(totals.videos)} files`} />
        </div>
      </section>

      <CoverageSection coverage={coverage} />
      <IssuesSection issues={issues} />
      {processors && <ProcessorsSection processors={processors} />}
      <HeritageSection heritage={heritage} />
      {faces   && <FacesSection faces={faces} />}
      {scenes  && <ScenesSection scenes={scenes} />}
      {people  && <PeopleSection people={people} />}
      <DirsSection byDir={by_dir} />
      {extensions && <ExtensionsSection extensions={extensions} />}
    </div>
  )
}
