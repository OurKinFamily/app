import { cn } from '../lib/cn'

// Tones map to a fill colour. The track is always the same neutral white/10.
const FILL = {
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  amber:  'bg-amber-500',
  red:    'bg-red-500',
  purple: 'bg-purple-500',
}

const PCT_PILL = {
  blue:   'bg-blue-500/15  text-blue-300   border-blue-500/35',
  green:  'bg-green-500/15 text-green-300  border-green-500/35',
  amber:  'bg-amber-500/15 text-amber-300  border-amber-500/35',
  red:    'bg-red-500/15   text-red-300    border-red-500/35',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/35',
}

const HEIGHT = {
  sm: 'h-0.5',
  md: 'h-1',
  lg: 'h-2',
}

// Progress bar with optional pct + count chips.
//   pct       — 0..100. Required.
//   cur, tot  — used when showCounts is true; rendered as "1,234 / 12,345".
//   tone      — fill colour. Default blue.
//   size      — track height. sm | md | lg. Default md.
//   showPct   — render the pct as a colored pill above the bar. Default false.
//   showCounts— render cur/tot as a pill above the bar. Default false.
export function ProgressBar({
  pct, cur, tot,
  tone = 'blue', size = 'md',
  showPct = false, showCounts = false,
  className,
}) {
  const safePct = Math.max(0, Math.min(100, pct || 0))
  const fill    = FILL[tone] || FILL.blue
  const pill    = PCT_PILL[tone] || PCT_PILL.blue
  const track   = HEIGHT[size] || HEIGHT.md

  return (
    <div className={cn('w-full', className)}>
      {(showPct || showCounts) && (
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {showPct && (
            <span className={cn('rounded-full border px-1.5 py-0.5 text-[11px] tabular-nums', pill)}>
              {safePct.toFixed(1)}%
            </span>
          )}
          {showCounts && cur != null && tot != null && (
            <span className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[11px] tabular-nums text-white/60">
              {Number(cur).toLocaleString()} / {Number(tot).toLocaleString()}
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-white/10', track)}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', fill)}
          style={{ width: `${safePct}%` }}
        />
      </div>
    </div>
  )
}
