import { useRef } from 'react'

// Horizontal scrolling strip styled like a piece of 35mm film: dark
// celluloid body with sprocket-hole runs along the top + bottom edges.
// Hides the scrollbar; vertical mouse-wheel becomes horizontal scroll
// so desktop users still have an affordance. Domain-agnostic.

// Sprocket holes: small light-coloured rectangles repeated along a
// dark strip. Drawn entirely in CSS via a repeating gradient — no
// images / svgs needed.
const HOLE_W = 10   // px
const HOLE_GAP = 8  // px
const sprocketStyle = {
  backgroundImage: `repeating-linear-gradient(
    to right,
    #f4f4f5 0,
    #f4f4f5 ${HOLE_W}px,
    transparent ${HOLE_W}px,
    transparent ${HOLE_W + HOLE_GAP}px
  )`,
  backgroundRepeat: 'repeat-x',
  // 55% of the strip height — leaves a dark margin top + bottom so the
  // holes read as rectangular punches, not full-height bars.
  backgroundSize: `${HOLE_W + HOLE_GAP}px 35%`,
  backgroundPosition: 'center',
}

export function PhotoStrip({ children, className = '' }) {
  const scrollRef = useRef(null)
  const onWheel = e => {
    if (e.deltaY === 0) return
    scrollRef.current.scrollLeft += e.deltaY
    e.preventDefault()
  }
  return (
    <div className={`overflow-hidden rounded-sm bg-neutral-950 ring-1 ring-black/80 ${className}`}>
      {/* Top sprocket-hole run */}
      <div className="h-3 w-full" style={sprocketStyle} />

      {/* Frames track. White "leader" caps at start + end mimic the
          unexposed leader on real 35mm film. */}
      <div
        ref={scrollRef}
        onWheel={onWheel}
        className="flex gap-2 overflow-x-auto px-2 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="h-24 w-6 shrink-0 rounded-sm bg-zinc-100" />
        {children}
        <div className="h-24 w-6 shrink-0 rounded-sm bg-zinc-100" />
      </div>

      {/* Bottom sprocket-hole run */}
      <div className="h-3 w-full" style={sprocketStyle} />
    </div>
  )
}
