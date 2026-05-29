// Shared building blocks for the admin trio (Overview / Analytics / Health).
// Anything that smells like a stat tile, a bar list, or an expandable
// section should live here so the three pages stay visually uniform and
// new admin pages can compose without duplicating CSS.

import { fmt } from './format'

export function StatTile({ label, value, sub, onClick }) {
  const base = 'flex flex-col items-center justify-center gap-1.5 rounded-lg border border-white/8 bg-white/3 p-2 text-center [container-type:inline-size]'
  const body = (
    <>
      <div className="text-[10px] uppercase tracking-wider text-white/35">{label}</div>
      <div className="break-words font-semibold leading-tight text-white [font-size:clamp(14px,8cqi,22px)]">
        {value}
      </div>
      {sub && <div className="text-[10px] text-white/35">{sub}</div>}
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} w-full transition-colors hover:border-white/20 hover:bg-white/8`}>
        {body}
      </button>
    )
  }
  return <div className={base}>{body}</div>
}

const GRID = {
  three: 'grid gap-2 grid-cols-3',
  four:  'grid gap-2 grid-cols-2 sm:grid-cols-4',
  six:   'grid gap-2 grid-cols-3 sm:grid-cols-6',
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</h2>
        {subtitle && <span className="text-[11px] text-white/30">{subtitle}</span>}
      </div>
      {action}
    </div>
  )
}

export function StatSection({ title, subtitle, children, cols = 'three' }) {
  return (
    <section>
      <SectionHeader title={title} subtitle={subtitle} />
      <div className={GRID[cols] || GRID.three}>{children}</div>
    </section>
  )
}

export function ExpandableSection({ title, collapsedSubtitle, expandedSubtitle, expanded, onToggle, collapsed, expandedContent }) {
  return (
    <section>
      <SectionHeader
        title={title}
        subtitle={expanded ? expandedSubtitle : collapsedSubtitle}
        action={
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] uppercase tracking-wider text-white/50 underline decoration-white/15 underline-offset-2 hover:text-white"
          >
            {expanded ? 'LESS' : 'MORE'}
          </button>
        }
      />
      {expanded ? expandedContent : collapsed}
    </section>
  )
}

export function BarBucketBody({ buckets, onClick }) {
  if (!buckets) return <p className="text-[12px] text-white/30">Loading…</p>
  if (buckets.length === 0) return null
  const max = Math.max(...buckets.map(b => b.count))
  const vertical = buckets.length > 10

  if (vertical) {
    // Dense charts (>40 bars) suppress per-bar labels — they'd just
    // overlap into mush. Hover shows the value/label via title attr.
    const dense = buckets.length > 40
    // Sparse label markers along the axis for very dense charts so the
    // x-axis still has SOME reference points. Pick ~6 evenly-spaced bars
    // and label only those.
    const markerStride = Math.max(1, Math.ceil(buckets.length / 6))
    return (
      <div className="flex h-40 w-full items-stretch gap-px overflow-hidden rounded border border-white/8 bg-white/3 p-2">
        {buckets.map((b, i) => {
          const p = max ? (b.count / max) * 100 : 0
          const showLabel = !dense || i % markerStride === 0
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => onClick && onClick(b)}
              title={`${b.label} · ${b.count.toLocaleString()}`}
              className="group flex h-full min-w-0 flex-1 flex-col items-center gap-1"
            >
              <div className="flex w-full flex-1 items-end">
                <div className="w-full rounded-t bg-purple-500/55 transition-colors group-hover:bg-purple-400/80" style={{ height: `${p}%` }} />
              </div>
              {showLabel ? (
                <span className="truncate text-[9px] tabular-nums text-white/40 group-hover:text-white/70">
                  {String(b.label).split(':')[0]}
                </span>
              ) : (
                <span className="h-[10px]" />
              )}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className="space-y-1">
      {buckets.map(b => {
        const p = max ? (b.count / max) * 100 : 0
        return (
          <button
            key={b.key}
            type="button"
            onClick={() => onClick && onClick(b)}
            className="grid w-full grid-cols-[60px_1fr_70px] items-center gap-3 rounded px-1 text-left text-[12px] transition-colors hover:bg-white/5"
          >
            <span className="truncate font-medium text-white/65">{b.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-purple-500/60" style={{ width: `${p}%` }} />
            </div>
            <span className="text-right tabular-nums text-white/55">{fmt(b.count)}</span>
          </button>
        )
      })}
    </div>
  )
}

export function TopCardGridBody({ buckets, onClick }) {
  if (buckets === null) return <p className="text-[12px] text-white/30">Loading…</p>
  if (!buckets || buckets.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      {buckets.slice(0, 3).map(b => (
        <button
          key={b.key}
          type="button"
          onClick={() => onClick && onClick(b)}
          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-white/8 bg-white/3 p-3 text-center transition-colors hover:border-white/20 hover:bg-white/8 [container-type:inline-size]"
        >
          {b.sub && <div className="text-[10px] uppercase tracking-wider text-white/35">{b.sub}</div>}
          <div className="break-words font-semibold leading-tight text-white [font-size:clamp(10px,7cqi,15px)]">{b.label}</div>
        </button>
      ))}
    </div>
  )
}
