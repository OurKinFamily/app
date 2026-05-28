import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { scaleLinear, scaleSqrt } from '@visx/scale'
import { AreaClosed } from '@visx/shape'
import { curveBasis } from '@visx/curve'
import { Avatar } from './Avatar'
import { Tag } from './Tag'
import { mediaUrl } from '../lib/media'
import { displayName } from '../lib/people'

// Ridgeline-style joy plot. One row per person: avatar + name on the
// left, a filled density curve on the right showing how many photos of
// them exist per year. All rows share one X scale (year) and one Y
// scale (photo count) so heights are comparable across people.
//
// Differs from the gantt: gantt shows SPAN; this shows DENSITY. The
// 1995 Christmas batch where mom shows up 80 times is a visible bump
// on her ridge — the gantt only shows she "appeared in 1995".

const DEFAULT_MIN = 30
const DEFAULT_LIMIT = 12
const W = 1000        // SVG viewBox width (year axis)
const ROW_H = 60      // SVG viewBox height per ridge row

function tier(count) {
  if (count >= 2000) return '#ec4899' // pink-500
  if (count >=  500) return '#8b5cf6' // violet-500
  if (count >=  200) return '#3b82f6' // blue-500
  if (count >=   50) return '#0891b2' // cyan-600
  return                   '#475569'  // slate-600
}

// Fill in years with zero counts so the closed area doesn't skip gaps.
function densify(points, min, max) {
  const m = new Map(points.map(p => [p.year, p.count]))
  const out = []
  for (let y = min; y <= max; y++) out.push({ year: y, count: m.get(y) || 0 })
  return out
}

export function PersonRidgeline({ endpoint }) {
  const [rows, setRows] = useState(null)
  const [min, setMin]   = useState(DEFAULT_MIN)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const navigate = useNavigate()

  useEffect(() => {
    setRows(null)
    fetch(`${endpoint}?min_photos=${min}`)
      .then(r => r.ok ? r.json() : [])
      .then(setRows)
      .catch(() => setRows([]))
  }, [endpoint, min])

  if (rows === null) return <p className="text-[13px] text-white/30">Loading…</p>
  if (rows.length === 0) {
    return <p className="text-[13px] text-white/30">No people meet the ≥ {min} photo threshold. Try lowering it.</p>
  }

  const visible = limit === 'all' ? rows : rows.slice(0, limit)
  const allYears  = visible.flatMap(r => r.points.map(p => p.year))
  const minYear = Math.min(...allYears)
  const maxYear = Math.max(...allYears)
  const span    = Math.max(1, maxYear - minYear)

  const x = scaleLinear({ domain: [minYear, maxYear], range: [0, W] })

  // Year labels: every 5 years, HTML-rendered (avoids SVG text scaling
  // weirdness under preserveAspectRatio="none").
  const labelYears = []
  for (let y = Math.ceil(minYear / 5) * 5; y <= maxYear; y += 5) labelYears.push(y)

  return (
    <div className="space-y-3">
      <Controls
        min={min} setMin={setMin}
        limit={limit} setLimit={setLimit}
        count={rows.length} visibleCount={visible.length}
      />

      <div className="rounded-lg border border-white/10 bg-white/2 p-3">
        {/* Year axis — HTML labels positioned absolutely. Same 144px gutter
            as the rows below so labels align with ridges. */}
        <div className="flex">
          <div className="w-36 shrink-0" />
          <div className="relative h-5 flex-1 text-[10px] text-white/40">
            {labelYears.map(y => {
              const left = ((y - minYear) / span) * 100
              return (
                <span
                  key={y}
                  className={`absolute top-0 ${y % 10 === 0 ? 'text-white/70' : ''}`}
                  style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
                >
                  {y}
                </span>
              )
            })}
          </div>
          <div className="w-12 shrink-0" />
        </div>

        <div className="mt-1 space-y-0.5">
          {visible.map(r => {
            const data = densify(r.points, minYear, maxYear)
            const color = tier(r.total)
            // Per-row Y scale: each ridge normalized to its own peak so the
            // shape of one person's life is readable even when another
            // person had a 2000-photo year. Sqrt softens the peak so a
            // single huge year doesn't dwarf neighboring years.
            const rowMax = Math.max(1, ...r.points.map(p => p.count))
            const y = scaleSqrt({ domain: [0, rowMax], range: [ROW_H, 0] })
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => navigate(`/manage/people/${r.id}`)}
                className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-white/5"
                title={`${displayName(r)} · ${r.total.toLocaleString()} photos · peak ${rowMax.toLocaleString()} in one year`}
              >
                <Avatar
                  src={r.avatar ? mediaUrl(r.avatar) : null}
                  name={r.name}
                  size="sm"
                />
                <span className="w-28 shrink-0 truncate text-[11px] text-white/65">
                  {displayName(r)}
                </span>
                <svg
                  viewBox={`0 0 ${W} ${ROW_H}`}
                  preserveAspectRatio="none"
                  className="h-10 flex-1"
                >
                  <AreaClosed
                    data={data}
                    x={d => x(d.year)}
                    y={d => y(d.count)}
                    yScale={y}
                    fill={color}
                    fillOpacity={0.55}
                    stroke={color}
                    strokeWidth={1}
                    strokeOpacity={0.9}
                    curve={curveBasis}
                  />
                </svg>
                <span className="w-12 shrink-0 text-right text-[10px] text-white/40 tabular-nums">
                  {r.total.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Controls({ min, setMin, limit, setLimit, count, visibleCount }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px] text-white/50">
      <span className="flex items-center gap-2">
        <span>≥</span>
        <select
          value={min}
          onChange={e => setMin(Number(e.target.value))}
          className="rounded border border-white/15 bg-zinc-900 px-2 py-1 text-white"
        >
          {[10, 30, 50, 100, 200, 500].map(n => (
            <option key={n} value={n} className="bg-zinc-900 text-white">{n}</option>
          ))}
        </select>
        <span>photos</span>
      </span>
      <span className="flex items-center gap-2">
        <span>show</span>
        <select
          value={limit}
          onChange={e => setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="rounded border border-white/15 bg-zinc-900 px-2 py-1 text-white"
        >
          {[6, 12, 25, 50, 100].map(n => (
            <option key={n} value={n} className="bg-zinc-900 text-white">{n}</option>
          ))}
          <option value="all" className="bg-zinc-900 text-white">all</option>
        </select>
        <span>rows</span>
      </span>
      <Tag tone="slate">{visibleCount} of {count}</Tag>
    </div>
  )
}
