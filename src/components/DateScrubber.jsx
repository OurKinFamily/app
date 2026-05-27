import { useRef, useState } from 'react'
import { cn } from '../lib/cn'

// Right-edge date scrubber. Years stretch to fill the full viewport (no
// internal scroll). Drag along the column to scrub; release to jump. Only
// labels around the cursor + decade markers render — keeps the column tidy
// when there are 40+ years.
//
// Future-proofed for month/day drill-in:
//   - internal `zoomLevel` state ('year' for now) — flips when speed-tracking
//     detects a slow hover that should expand
//   - the visible-label window is parameterised by `windowRadius` so a future
//     month-mode reuses the same rendering with a different label set
//
// `years` is `[{year, count}]` from /api/gallery/years; component arranges
// them oldest-first (top) → newest (bottom). Desktop only — mobile chrome
// is too tight.

const WINDOW_RADIUS = 3       // ± years around active year that get labels
const DECADE_LABEL  = y => y % 10 === 0  // always-on decade markers

export function DateScrubber({ years = [], currentYear, onJump }) {
  const containerRef = useRef(null)
  const [hoverYear, setHoverYear] = useState(null)
  const [dragging,  setDragging]  = useState(false)

  if (!years.length) return null

  // Descending order: newest (today) at top, oldest at bottom.
  const ordered = [...years].sort((a, b) => b.year - a.year)
  const active  = hoverYear ?? currentYear ?? ordered[0].year

  function yearFromY(clientY) {
    const el = containerRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    // Account for vertical padding (py-2 = 8px each side) so the cursor
    // maps to year rows, not the padding zone.
    const PAD = 8
    const usable = rect.height - PAD * 2
    if (usable <= 0) return null
    const pct = Math.max(0, Math.min(1, (clientY - rect.top - PAD) / usable))
    const idx = Math.min(ordered.length - 1, Math.floor(pct * ordered.length))
    return ordered[idx].year
  }

  // During drag we only update the visual indicator. Navigation fires once
  // on release — otherwise every pixel of drag triggers a full fetch/scroll
  // cascade and the page never lands on the final position.
  function onPointerDown(e) {
    e.preventDefault()
    setDragging(true)
    const y = yearFromY(e.clientY)
    setHoverYear(y)
    containerRef.current?.setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e) {
    const y = yearFromY(e.clientY)
    setHoverYear(y)
  }
  function onPointerUp(e) {
    setDragging(false)
    const y = yearFromY(e.clientY)
    if (y != null && y !== currentYear) onJump(y)
  }
  function onPointerLeave() {
    if (!dragging) setHoverYear(null)
  }

  function showLabel(year) {
    if (Math.abs(year - active) <= WINDOW_RADIUS) return true
    if (DECADE_LABEL(year)) return true
    return false
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      className={cn(
        'fixed right-0 top-[var(--app-header-h,3rem)] z-[1200] hidden h-[calc(100vh-var(--app-header-h,3rem))] w-12 touch-none select-none flex-col bg-black/20 py-2 transition-colors hover:bg-black/85 md:flex md:w-14',
        dragging ? 'cursor-grabbing' : 'cursor-ns-resize',
      )}
    >
      {ordered.map(({ year }) => {
        const isActive   = active === year
        const isCurrent  = currentYear === year
        const hasLabel   = showLabel(year)
        return (
          <button
            key={year}
            type="button"
            onClick={e => { e.stopPropagation(); onJump(year) }}
            className={cn(
              'group flex min-h-0 flex-1 items-center justify-end gap-1.5 px-2 text-right tabular-nums transition-colors',
              dragging ? 'cursor-grabbing' : 'cursor-ns-resize',
              isActive ? 'text-white' : isCurrent ? 'text-white/80' : 'text-white/40',
            )}
          >
            {hasLabel
              ? <span className={cn('truncate', isActive ? 'text-[13px] font-semibold' : 'text-[10px]')}>{year}</span>
              : <span className="h-px w-1.5 bg-white/30 group-hover:bg-white/70" />}
          </button>
        )
      })}
    </div>
  )
}
