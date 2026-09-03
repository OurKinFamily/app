import { BRIGHTNESS, HUES } from '../../lib/useAnalytics'
import { fmt } from '../../../components/admin/format'
import { C } from '../tokens'

/**
 * The archive by colour.
 *
 * Each tile is drawn from the actual colours in that bucket where the endpoint
 * sends four samples, rather than from a fixed swatch per hue name. "Brown" in
 * this archive is a room lit by a lamp in 1974, and the stock brown says
 * nothing about that.
 */
export function HueTiles({ rows, total, onOpen }) {
  if (!rows?.length) return null
  return (
    <div style={{
      display: 'grid', gap: 8,
      gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
    }}>
      {rows.map(row => (
        <HueTile
          key={row.hue}
          row={row}
          share={total ? (row.count / total) * 100 : 0}
          onClick={() => onOpen(row)}
        />
      ))}
    </div>
  )
}

function HueTile({ row, share, onClick }) {
  const swatch = row.samples?.length === 4
    ? `linear-gradient(135deg, ${row.samples.join(', ')})`
    : (HUES[row.hue] || HUES.mixed)

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left', font: 'inherit',
        padding: 10, borderRadius: 10, cursor: 'pointer',
        border: `1px solid ${C.border}`, background: C.bg,
      }}
    >
      <span style={{
        display: 'block', width: '100%', aspectRatio: '2.4', borderRadius: 7,
        background: swatch, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)',
      }} />
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 7 }}>
        <span style={{ fontSize: 12.5, textTransform: 'capitalize', flex: 1 }}>{row.hue}</span>
        <span style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
          {share.toFixed(1)}%
        </span>
      </span>
      <span style={{ display: 'block', fontSize: 11, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
        {fmt(row.count)}
      </span>
    </button>
  )
}

export function BrightnessTiles({ rows }) {
  const total = (rows || []).reduce((a, r) => a + r.count, 0)
  if (!rows?.length) return null

  return (
    <div style={{
      display: 'grid', gap: 8,
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    }}>
      {rows.map(row => (
        <div key={row.band} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: 10, borderRadius: 10, border: `1px solid ${C.border}`,
        }}>
          <span style={{
            width: 34, height: 34, borderRadius: 8, flex: '0 0 auto',
            background: BRIGHTNESS[row.band],
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)',
          }} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 12.5, textTransform: 'capitalize' }}>
              {row.band}
            </span>
            <span style={{ display: 'block', fontSize: 11.5, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
              {total ? ((row.count / total) * 100).toFixed(1) : '0'}% · {fmt(row.count)}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** A ranked list where every row can be opened. */
export function Bars({ buckets, onOpen }) {
  if (!buckets?.length) return null
  const peak = Math.max(...buckets.map(b => b.count), 1)

  return (
    <div style={{ display: 'grid', gap: 3 }}>
      {buckets.map(b => (
        <button
          key={b.key}
          type="button"
          onClick={() => onOpen?.(b)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '2px 4px', border: 0, borderRadius: 6,
            background: 'transparent', font: 'inherit', cursor: onOpen ? 'pointer' : 'default',
            textAlign: 'left',
          }}
        >
          <span style={{
            width: 92, flex: '0 0 auto', fontSize: 11.5, color: C.muted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {b.label}
          </span>
          <span style={{ flex: 1, height: 14, borderRadius: 3, background: C.hover, overflow: 'hidden' }}>
            <span style={{
              display: 'block', height: '100%',
              width: `${Math.max((b.count / peak) * 100, 1)}%`,
              background: C.activeText, opacity: 0.75,
            }} />
          </span>
          <span style={{
            width: 62, flex: '0 0 auto', fontSize: 11.5, color: C.muted,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {b.count.toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  )
}
