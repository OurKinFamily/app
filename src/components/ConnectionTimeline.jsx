import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag } from './Tag'
import { Avatar } from './Avatar'
import { mediaUrl } from '../lib/media'
import { displayName, otherName } from '../lib/people'
import { yearOf, packLanes, groupBySpan } from '../lib/timelineLanes'

// Lane-packed gantt of co-appearances. Each person is a horizontal bar
// from first → last photo with the subject. Bars share lanes whenever
// they don't overlap in time, so 100 people might fit in ~20 lanes.
// Bar opacity scales with photo count — deep relationships pop.
//
// Pure APPEARS_IN intersection — does NOT use the explicit Connections
// graph.

const DEFAULT_MIN = 10
const LANE_H      = 16   // px
const LANE_GAP    = 4    // px
const LEFT_LABEL  = 0    // gantt uses the full width; names render on hover

export function ConnectionTimeline({ endpoint }) {
  const [rows, setRows] = useState(null)
  const [min,  setMin]  = useState(DEFAULT_MIN)
  const [stack, setStack] = useState(true)
  const [hover, setHover] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    setRows(null)
    fetch(`${endpoint}?min_photos=${min}`)
      .then(r => r.ok ? r.json() : [])
      .then(setRows)
      .catch(() => setRows([]))
  }, [endpoint, min])

  return (
    <div className="space-y-3">
      <ThresholdControl min={min} setMin={setMin} stack={stack} setStack={setStack} count={rows?.length} />

      {rows === null && <p className="text-[13px] text-white/30">Loading…</p>}

      {rows && rows.length === 0 && (
        <p className="text-[13px] text-white/30">
          No people meet the ≥ {min} co-appearance threshold. Try lowering it.
        </p>
      )}

      {rows && rows.length > 0 && (
        <GanttLanes rows={rows} stack={stack} hover={hover} setHover={setHover} navigate={navigate} />
      )}
    </div>
  )
}

// Photo-count tiers. Color denotes how deep the relationship is rather
// than opacity — every bar stays fully opaque and the eye reads the color.
// Visual mapping; verified by e2e + visual regression, not unit tests.
function colorTier(count) {
  if (count >= 2000) return { bg: 'bg-pink-500',    hover: 'hover:bg-pink-400'    }
  if (count >=  500) return { bg: 'bg-violet-500',  hover: 'hover:bg-violet-400'  }
  if (count >=  200) return { bg: 'bg-blue-500',    hover: 'hover:bg-blue-400'    }
  if (count >=   50) return { bg: 'bg-cyan-600',    hover: 'hover:bg-cyan-500'    }
  return                   { bg: 'bg-slate-600',   hover: 'hover:bg-slate-500'   }
}

function GanttLanes({ rows, stack, hover, setHover, navigate }) {
  // `stack` toggles whether multiple people sharing a year-range collapse
  // into one combined bar. When false, every person gets their own bar.
  const merged = stack
    ? groupBySpan(rows)
    : rows.map(r => ({ ...r, people: [r] }))
  const { lanes, placed } = packLanes(merged)

  const minYear = Math.min(...merged.map(r => yearOf(r.first_ts)))
  const maxYear = Math.max(...merged.map(r => yearOf(r.last_ts)), new Date().getFullYear())
  const span    = Math.max(1, maxYear - minYear)

  // Every 5 years labeled along the top. Each individual year becomes a
  // faint tick mark — decades drawn brighter for orientation.
  const labelTicks = []
  for (let y = Math.ceil(minYear / 5) * 5; y <= maxYear; y += 5) labelTicks.push(y)
  const allYearTicks = []
  for (let y = minYear; y <= maxYear; y += 1) allYearTicks.push(y)

  const totalLanes = lanes.length
  const totalH = totalLanes * LANE_H + (totalLanes - 1) * LANE_GAP

  return (
    <div className="rounded-lg border border-white/10 bg-white/2 p-3">
      {/* Time axis — every 2 years labeled, rotated -90° so each year reads
          vertically. writing-mode + rotate(180deg) gives a vertical column
          that sits entirely above the gantt rows (no bleed into lane 0). */}
      <div className="relative mb-4 h-12 text-[10px] text-white/40">
        {labelTicks.map(y => {
          const left = ((y - minYear) / span) * 100
          return (
            <div
              key={y}
              className="absolute bottom-0"
              style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
            >
              <span
                className={`block leading-none ${y % 10 === 0 ? 'text-white/60 font-medium' : ''}`}
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                {y}
              </span>
            </div>
          )
        })}
      </div>

      {/* Year grid lines behind the bars — every year faint, decades brighter */}
      <div className="relative" style={{ height: totalH }}>
        {allYearTicks.map(y => {
          const left = ((y - minYear) / span) * 100
          const isDecade = y % 10 === 0
          return (
            <div
              key={y}
              className={`pointer-events-none absolute inset-y-0 border-l ${isDecade ? 'border-white/10' : 'border-white/3'}`}
              style={{ left: `${left}%` }}
            />
          )
        })}

        {placed.map(({ row, lane, start, end }) => {
          const left    = ((start - minYear) / span) * 100
          const width   = Math.max(0.5, ((end - start) / span) * 100)
          const top     = lane * (LANE_H + LANE_GAP)
          // Color tiers by absolute photo count — stable across sessions.
          const tier = colorTier(row.photo_count)
          const isHover = hover === row.id
          const isGroup = row.people.length > 1
          const people  = row.people
          const titleText = isGroup
            ? `${people.map(p => displayName(p)).join(', ')} · ${row.photo_count} photos · ${start}–${end}`
            : `${displayName(people[0])} · ${row.photo_count} photos · ${start}–${end}`
          const onClick = () => {
            if (isGroup) return
            navigate(`/manage/people/${people[0].id}`)
          }
          return (
            <button
              key={row.id}
              onMouseEnter={() => setHover(row.id)}
              onMouseLeave={() => setHover(null)}
              onClick={onClick}
              className={`absolute flex items-center overflow-hidden rounded-full text-[10px] font-medium text-white/95 transition-colors hover:z-10 ${tier.bg} ${tier.hover}`}
              style={{
                left:   `${left}%`,
                width:  `${width}%`,
                top,
                height: LANE_H,
              }}
              title={titleText}
            >
              <span className="flex items-center gap-1 pl-0.5">
                <span className="flex items-center">
                  {people.map((p, i) => (
                    <span key={p.id} className="-ml-1 first:ml-0 shrink-0 ring-1 ring-blue-500/80 rounded-full" style={{ zIndex: people.length - i }}>
                      <Avatar
                        src={p.avatar ? mediaUrl(p.avatar) : null}
                        name={p.name}
                        size="xs"
                      />
                    </span>
                  ))}
                </span>
                {people.length <= 3 && (
                  <span className="truncate pr-1">
                    {people.map(p => displayName(p)).join(', ')}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Hover detail */}
      <div className="mt-3 min-h-5 text-[11px] text-white/50">
        {hover && (() => {
          const r = placed.find(x => x.row.id === hover).row
          const people = r.people
          return (
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span>{yearOf(r.first_ts)}–{yearOf(r.last_ts)}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/40">{r.photo_count.toLocaleString()} photos</span>
              <span className="text-white/30">·</span>
              <span className="flex flex-wrap gap-x-2">
                {people.map(p => (
                  <span key={p.id} className="text-white/85">
                    {displayName(p)}
                    {otherName(p) && <span className="ml-1 text-white/40">({otherName(p)})</span>}
                  </span>
                ))}
              </span>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function ThresholdControl({ min, setMin, stack, setStack, count }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px] text-white/50">
      <span className="flex items-center gap-2">
        <span>Show people with at least</span>
        <select
          value={min}
          onChange={e => setMin(Number(e.target.value))}
          className="rounded border border-white/15 bg-zinc-900 px-2 py-1 text-white"
        >
          {[5, 10, 20, 30, 50, 100, 200].map(n => (
            <option key={n} value={n} className="bg-zinc-900 text-white">{n}</option>
          ))}
        </select>
        <span>co-appearances</span>
      </span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={stack}
          onChange={e => setStack(e.target.checked)}
          className="h-3.5 w-3.5 cursor-pointer accent-blue-500"
        />
        <span>Group people with matching year ranges</span>
      </label>
      {count != null && <Tag tone="slate">{count} {count === 1 ? 'person' : 'people'}</Tag>}
    </div>
  )
}
