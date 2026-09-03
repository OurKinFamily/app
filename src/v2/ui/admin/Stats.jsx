import { useState } from 'react'
import { C } from '../tokens'

/** A heading with a quiet aside, above every block on the admin pages. */
export function Section({ title, aside, children, style }) {
  return (
    <section style={{ marginBottom: 26, ...style }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 13.5, fontWeight: 500, margin: 0 }}>{title}</h2>
        {aside && <span style={{ fontSize: 12, color: C.muted }}>{aside}</span>}
      </div>
      {children}
    </section>
  )
}

export function StatGrid({ children, min = 150 }) {
  return (
    <div style={{
      display: 'grid', gap: 8,
      gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
    }}>
      {children}
    </div>
  )
}

export function StatTile({ label, value, sub, onClick }) {
  const [lit, setLit] = useState(false)
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      style={{
        display: 'block', width: '100%', textAlign: 'left', font: 'inherit',
        padding: '10px 12px', borderRadius: 10,
        border: `1px solid ${onClick && lit ? C.muted : C.border}`,
        background: onClick && lit ? C.hover : C.bg,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: 11.5, color: C.muted, textTransform: 'capitalize' }}>{label}</div>
      <div style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </Tag>
  )
}

/**
 * A ranked list of counts, drawn as bars.
 *
 * Bars are sized against the largest in the set rather than against the total.
 * Against the total, one year holding a third of the archive leaves every
 * other year a hairline, and the shape of the collection — which is the only
 * reason to draw this at all — disappears.
 */
export function BarBuckets({ buckets, limit = 0 }) {
  const [all, setAll] = useState(false)
  if (!buckets?.length) return null

  const shown = !limit || all ? buckets : buckets.slice(0, limit)
  const peak = Math.max(...buckets.map(b => b.count), 1)

  return (
    <div>
      <div style={{ display: 'grid', gap: 3 }}>
        {shown.map(b => (
          <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 62, flex: '0 0 auto', fontSize: 11.5, color: C.muted, textAlign: 'right' }}>
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
          </div>
        ))}
      </div>

      {limit > 0 && buckets.length > limit && (
        <button type="button" onClick={() => setAll(v => !v)} style={link}>
          {all ? 'Show fewer' : `Show all ${buckets.length}`}
        </button>
      )}
    </div>
  )
}

const link = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 12.5, cursor: 'pointer', padding: '6px 0 0',
}
