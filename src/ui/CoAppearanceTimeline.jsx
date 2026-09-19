import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from './Avatar'
import { groupBySpan, packLanes, yearOf } from '../lib/timelineLanes'
import { displayName } from '../lib/people'
import { mediaUrl } from '../lib/media'
import { LoadingDots } from './LoadingDots'
import { C } from './tokens'

/**
 * Who was around, and when.
 *
 * One bar per person, running from the first photograph they share with the
 * subject to the last. Bars share a lane whenever they do not overlap in time,
 * so ninety-six people fit in twenty lanes instead of ninety-six rows.
 *
 * This is pure co-appearance — who turns up in the same pictures — and not the
 * Connections graph. It answers a question nobody has written down: the
 * schoolfriend who appears for four years and stops, the neighbour present at
 * every Christmas for a decade.
 *
 * Colour is the depth of the relationship, not opacity. Faded bars read as
 * "loading" or "unimportant"; colour reads as a scale.
 */

const LANE_H = 18
const LANE_GAP = 5
const DEFAULT_MIN = 10

// The same five bands as the family ridgeline, so a person keeps their colour
// between the two charts.
function tier(count) {
  if (count >= 2000) return '#d81b60'
  if (count >= 500) return '#7b3fe4'
  if (count >= 200) return '#1a73e8'
  if (count >= 50) return '#00838f'
  return '#8a929c'
}

export function CoAppearanceTimeline({ endpoint }) {
  const [rows, setRows] = useState(null)
  const [min, setMin] = useState(DEFAULT_MIN)
  const [stack, setStack] = useState(true)
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    let alive = true
    fetch(`${endpoint}?min_photos=${min}`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (alive) setRows(d) })
      .catch(() => { if (alive) setRows([]) })
    return () => { alive = false }
  }, [endpoint, min])

  if (rows === null) return <LoadingDots />

  return (
    <div>
      <Controls
        min={min} setMin={setMin}
        stack={stack} setStack={setStack}
        count={rows.length}
      />

      {rows.length === 0 ? (
        <p style={{ fontSize: 13.5, color: C.muted, padding: '28px 0' }}>
          Nobody appears in {min} or more of the same photographs. Try a lower
          number.
        </p>
      ) : (
        <Lanes
          rows={rows}
          stack={stack}
          hovered={hovered}
          onHover={setHovered}
        />
      )}
    </div>
  )
}

function Lanes({ rows, stack, hovered, onHover }) {
  const navigate = useNavigate()
  // Stacking merges people whose years match exactly — a family photographed
  // together for thirty years is one bar, not five identical ones.
  const merged = stack ? groupBySpan(rows) : rows.map(r => ({ ...r, people: [r] }))
  const { lanes, placed } = packLanes(merged)

  const minYear = Math.min(...merged.map(r => yearOf(r.first_ts)))
  const maxYear = Math.max(...merged.map(r => yearOf(r.last_ts)), new Date().getFullYear())
  const span = Math.max(1, maxYear - minYear)
  const height = lanes.length * LANE_H + (lanes.length - 1) * LANE_GAP

  const labels = []
  for (let y = Math.ceil(minYear / 5) * 5; y <= maxYear; y += 5) labels.push(y)

  const detail = hovered && placed.find(p => p.row.id === hovered)?.row

  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '10px 12px 12px', marginTop: 12,
    }}>
      {/* Horizontal years. v1 turned them on their side to fit; at five-year
          steps on a light ground there is room to simply read them. */}
      <div style={{ position: 'relative', height: 16, fontSize: 10, marginBottom: 8 }}>
        {labels.map(y => (
          <span
            key={y}
            style={{
              position: 'absolute', left: `${((y - minYear) / span) * 100}%`,
              transform: 'translateX(-50%)',
              color: y % 10 === 0 ? C.text : C.muted,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {y}
          </span>
        ))}
      </div>

      <div style={{ position: 'relative', height }}>
        {labels.map(y => (
          <div
            key={y}
            aria-hidden="true"
            style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${((y - minYear) / span) * 100}%`,
              borderLeft: `1px solid ${y % 10 === 0 ? C.border : '#f1f3f4'}`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {placed.map(({ row, lane, start, end }) => {
          const people = row.people
          const alone = people.length === 1
          return (
            <button
              key={row.id}
              type="button"
              onMouseEnter={() => onHover(row.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(row.id)}
              onBlur={() => onHover(null)}
              onClick={() => alone && navigate(`/people/${people[0].id}`)}
              title={`${people.map(displayName).join(', ')} · ${row.photo_count.toLocaleString()} photos · ${start}–${end}`}
              style={{
                position: 'absolute',
                left: `${((start - minYear) / span) * 100}%`,
                width: `${Math.max(0.6, ((end - start) / span) * 100)}%`,
                top: lane * (LANE_H + LANE_GAP),
                height: LANE_H,
                display: 'flex', alignItems: 'center', gap: 4,
                padding: 0, paddingRight: 6, border: 0, borderRadius: 999,
                background: tier(row.photo_count), color: '#fff',
                fontSize: 10, fontWeight: 500, overflow: 'hidden',
                cursor: alone ? 'pointer' : 'default',
                outline: hovered === row.id ? `2px solid ${C.text}` : 'none',
                outlineOffset: 1,
                zIndex: hovered === row.id ? 2 : 1,
              }}
            >
              <span style={{ display: 'flex', flex: '0 0 auto' }}>
                {people.slice(0, 3).map((p, i) => (
                  <span key={p.id} style={{ marginLeft: i ? -6 : 0, lineHeight: 0 }}>
                    <Avatar
                      name={p.name}
                      src={p.avatar ? mediaUrl(p.avatar) : null}
                      size={LANE_H}
                    />
                  </span>
                ))}
              </span>
              {people.length <= 3 && (
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {people.map(displayName).join(', ')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* One line, always present. Reserving the space stops the chart jumping
          as the pointer crosses a bar. */}
      <p style={{ minHeight: 18, margin: '12px 0 0', fontSize: 11.5, color: C.muted }}>
        {detail && (
          <>
            {yearOf(detail.first_ts)}–{yearOf(detail.last_ts)}
            {' · '}{detail.photo_count.toLocaleString()} photos together
            {' · '}{detail.people.map(displayName).join(', ')}
          </>
        )}
      </p>
    </div>
  )
}

function Controls({ min, setMin, stack, setStack, count }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14,
      fontSize: 12.5, color: C.muted,
    }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        At least
        <select
          value={min}
          onChange={e => setMin(Number(e.target.value))}
          style={{
            height: 30, padding: '0 8px', borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.bg,
            font: 'inherit', fontSize: 13, color: C.text, cursor: 'pointer',
          }}
        >
          {[5, 10, 20, 30, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        photographs together
      </label>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={stack}
          onChange={e => setStack(e.target.checked)}
          style={{ width: 14, height: 14, accentColor: C.activeText, cursor: 'pointer' }}
        />
        Combine people with the same years
      </label>

      {count != null && <span>{count} {count === 1 ? 'person' : 'people'}</span>}
    </div>
  )
}
