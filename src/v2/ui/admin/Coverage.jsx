import { FIELDS, pctTone } from '../../lib/useArchiveReport'
import { fmt } from '../../../components/admin/format'
import { C } from '../tokens'

/**
 * How far each processor has got, photographs and film side by side.
 *
 * A percentage on its own hides the shape of the problem: 99.4% of 155,000
 * files still leaves nine hundred of them, and the count beside the bar is
 * what says whether that is an afternoon or a fortnight.
 */
export function Coverage({ coverage }) {
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <div style={{ ...gridRow, fontSize: 11, color: C.muted, paddingBottom: 4 }}>
        <span />
        <span style={{ gridColumn: 'span 2', textAlign: 'center' }}>Photographs</span>
        <span style={{ gridColumn: 'span 2', textAlign: 'center' }}>Film</span>
      </div>

      {FIELDS.map(([field, label]) => {
        const image = coverage.images?.[field]
        const video = coverage.videos?.[field]
        return (
          <div key={field} style={{ ...gridRow, alignItems: 'center', padding: '3px 0' }}>
            <span style={{ fontSize: 12.5 }}>{label}</span>
            <Meter entry={image} />
            <Count entry={image} />
            <Meter entry={video} />
            <Count entry={video} />
          </div>
        )
      })}
    </div>
  )
}

function Meter({ entry }) {
  if (!entry) return <span />
  return (
    <span style={{ display: 'block', height: 6, borderRadius: 3, background: C.hover, overflow: 'hidden' }}>
      <span style={{
        display: 'block', height: '100%', borderRadius: 3,
        width: `${entry.pct}%`, background: pctTone(entry.pct),
      }} />
    </span>
  )
}

function Count({ entry }) {
  if (!entry) return <span style={{ fontSize: 11.5, color: C.muted, textAlign: 'right' }}>—</span>
  return (
    <span style={{
      fontSize: 11.5, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
      color: entry.pct >= 99 ? C.muted : pctTone(entry.pct),
    }}>
      {entry.pct.toFixed(1)}% · {fmt(entry.count)}
    </span>
  )
}

/** What is outright wrong, and what is merely not done yet. */
export function Issues({ issues, list }) {
  return (
    <div style={{
      display: 'grid', gap: 6,
      gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
    }}>
      {list.map(([key, label, serious]) => {
        const count = issues[key] ?? 0
        return (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`,
          }}>
            <span style={{ flex: 1, fontSize: 12.5, color: C.muted }}>{label}</span>
            <span style={{
              fontSize: 16, fontVariantNumeric: 'tabular-nums',
              // Only the ones that mean a file is damaged or unfindable go
              // red. "No description" on eight thousand files is a queue, and
              // colouring it like a fault trains you to ignore the colour.
              color: count === 0 ? '#137333' : serious ? '#c5221f' : C.text,
            }}>
              {fmt(count)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** A labelled proportion bar — processors, file types, anything shaped like that. */
export function Split({ rows, colours = {} }) {
  const total = rows.reduce((a, [, n]) => a + n, 0) || 1
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {rows.map(([name, count]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 132, flex: '0 0 auto', fontSize: 12.5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </span>
          <span style={{ flex: 1, height: 8, borderRadius: 4, background: C.hover, overflow: 'hidden' }}>
            <span style={{
              display: 'block', height: '100%', borderRadius: 4,
              width: `${(count / total) * 100}%`,
              background: colours[name] || C.activeText,
              opacity: colours[name] ? 1 : 0.75,
            }} />
          </span>
          <span style={{
            width: 66, flex: '0 0 auto', fontSize: 11.5, color: C.muted,
            textAlign: 'right', fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt(count)}
          </span>
        </div>
      ))}
    </div>
  )
}

const gridRow = {
  display: 'grid',
  gridTemplateColumns: 'minmax(140px, 190px) minmax(60px, 1fr) 108px minmax(60px, 1fr) 108px',
  gap: 10,
}
