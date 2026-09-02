import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { scaleLinear, scaleSqrt } from '@visx/scale'
import { AreaClosed } from '@visx/shape'
import { curveBasis } from '@visx/curve'
import { Avatar } from './Avatar'
import { LoadingDots } from './LoadingDots'
import { mediaUrl } from '../../lib/media'
import { displayName } from '../../lib/people'
import { C } from './tokens'

/**
 * One ridge per person: how often they appear, year by year.
 *
 * This shows DENSITY, not span. A gantt chart would say mum "appeared in
 * 1995"; the ridge shows the Christmas of 1995 where she turns up eighty
 * times, as a bump you can see from across the room.
 *
 * Every row shares one X scale, so 1916 sits above 1916 the whole way down and
 * a family's years line up. Each row keeps its OWN Y scale, normalised to its
 * own peak — otherwise one person with a 2,000-photo year flattens everybody
 * else into a straight line. Square root softens the peak further so a single
 * enormous year does not swallow the ones on either side.
 */

// Everybody, by default. A threshold of 30 answered "who is this archive
// mostly about", which the gallery already tells you; opening on all 484
// answers the more interesting question of who is in here at all — including
// the people with four photographs to their name.
const DEFAULT_MIN = 1
const DEFAULT_LIMIT = 'all'
const W = 1000     // viewBox width — the year axis
const ROW_H = 60   // viewBox height per ridge

// Warmer and less saturated than v1's, which was picked against near-black.
// The same five bands, so a person keeps the colour they had.
function tier(count) {
  if (count >= 2000) return '#d81b60'
  if (count >= 500) return '#7b3fe4'
  if (count >= 200) return '#1a73e8'
  if (count >= 50) return '#00838f'
  return '#8a929c'
}

// Fill in the empty years, or the closed area jumps the gaps and a person who
// vanished for a decade looks like they were photographed throughout it.
function densify(points, min, max) {
  const m = new Map(points.map(p => [p.year, p.count]))
  const out = []
  for (let y = min; y <= max; y++) out.push({ year: y, count: m.get(y) || 0 })
  return out
}

export function PersonRidgeline({ endpoint }) {
  const [rows, setRows] = useState(null)
  const [min, setMin] = useState(DEFAULT_MIN)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const navigate = useNavigate()

  // The previous ridges stay up while the next threshold loads. Blanking
  // first would collapse the page to a line of dots on every change of a
  // control that is meant to be nudged.
  useEffect(() => {
    let alive = true
    fetch(`${endpoint}?min_photos=${min}`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (alive) setRows(d) })
      .catch(() => { if (alive) setRows([]) })
    return () => { alive = false }
  }, [endpoint, min])

  if (rows === null) return <LoadingDots />

  const visible = limit === 'all' ? rows : rows.slice(0, limit)
  const years = visible.flatMap(r => r.points.map(p => p.year))
  const minYear = years.length ? Math.min(...years) : 1900
  const maxYear = years.length ? Math.max(...years) : 2000
  const span = Math.max(1, maxYear - minYear)
  const x = scaleLinear({ domain: [minYear, maxYear], range: [0, W] })

  // Labels every five years, drawn as HTML rather than SVG text: the chart is
  // stretched with preserveAspectRatio="none", which would stretch the
  // lettering with it.
  const labelYears = []
  for (let y = Math.ceil(minYear / 5) * 5; y <= maxYear; y += 5) labelYears.push(y)

  return (
    <div>
      <Controls
        min={min} setMin={setMin}
        limit={limit} setLimit={setLimit}
        count={rows.length} visibleCount={visible.length}
      />

      {rows.length === 0 ? (
        <p style={{ fontSize: 13.5, color: C.muted, padding: '32px 0' }}>
          Nobody appears in {min} or more photographs. Try a lower number.
        </p>
      ) : (
        <div style={{
          border: `1px solid ${C.border}`, borderRadius: 12,
          padding: 12, marginTop: 12, background: C.bg,
        }}>
          <div style={{ display: 'flex' }}>
            <div style={{ width: 144, flex: '0 0 auto' }} />
            <div style={{ position: 'relative', height: 20, flex: 1, fontSize: 10 }}>
              {labelYears.map(y => (
                <span
                  key={y}
                  style={{
                    position: 'absolute', top: 0,
                    left: `${((y - minYear) / span) * 100}%`,
                    transform: 'translateX(-50%)',
                    color: y % 10 === 0 ? C.text : C.muted,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {y}
                </span>
              ))}
            </div>
            <div style={{ width: 48, flex: '0 0 auto' }} />
          </div>

          <div style={{ marginTop: 4 }}>
            {visible.map(r => (
              <Ridge
                key={r.id}
                row={r}
                x={x}
                minYear={minYear}
                maxYear={maxYear}
                onOpen={() => navigate(`/v2/people/${r.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Ridge({ row, x, minYear, maxYear, onOpen }) {
  const [lit, setLit] = useState(false)
  const data = densify(row.points, minYear, maxYear)
  const color = tier(row.total)
  const rowMax = Math.max(1, ...row.points.map(p => p.count))
  const y = scaleSqrt({ domain: [0, rowMax], range: [ROW_H, 0] })

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      onFocus={e => setLit(e.target.matches(':focus-visible'))}
      onBlur={() => setLit(false)}
      title={`${displayName(row)} · ${row.total.toLocaleString()} photos · busiest year ${rowMax.toLocaleString()}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '2px 4px', border: 0, borderRadius: 8, textAlign: 'left',
        font: 'inherit', cursor: 'pointer',
        background: lit ? 'rgba(60,64,67,.06)' : 'transparent',
        transition: 'background 90ms ease',
      }}
    >
      <Avatar name={row.name} src={row.avatar ? mediaUrl(row.avatar) : null} size={26} />
      <span style={{
        width: 106, flex: '0 0 auto', fontSize: 11.5, color: C.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {displayName(row)}
      </span>
      <svg
        viewBox={`0 0 ${W} ${ROW_H}`}
        preserveAspectRatio="none"
        style={{ height: 40, flex: 1 }}
      >
        <AreaClosed
          data={data}
          x={d => x(d.year)}
          y={d => y(d.count)}
          yScale={y}
          fill={color}
          fillOpacity={0.4}
          stroke={color}
          strokeWidth={1}
          strokeOpacity={0.85}
          curve={curveBasis}
        />
      </svg>
      <span style={{
        width: 48, flex: '0 0 auto', textAlign: 'right',
        fontSize: 10.5, color: C.muted, fontVariantNumeric: 'tabular-nums',
      }}>
        {row.total.toLocaleString()}
      </span>
    </button>
  )
}

function Controls({ min, setMin, limit, setLimit, count, visibleCount }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14,
      fontSize: 12.5, color: C.muted,
    }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        At least
        <select value={min} onChange={e => setMin(Number(e.target.value))} style={select}>
          {[1, 5, 10, 30, 50, 100, 200, 500].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        photos
      </label>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        Showing
        <select
          value={limit}
          onChange={e => setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          style={select}
        >
          {[6, 12, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          <option value="all">all</option>
        </select>
        of {count}
      </label>

      <span style={{ color: C.muted }}>{visibleCount} shown</span>
    </div>
  )
}

const select = {
  height: 30, padding: '0 8px', borderRadius: 8,
  border: `1px solid ${C.border}`, background: C.bg,
  font: 'inherit', fontSize: 13, color: C.text, cursor: 'pointer',
}
