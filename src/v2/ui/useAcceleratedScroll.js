import { useEffect, useRef } from 'react'

/**
 * Scrolling that speeds up the longer you keep going.
 *
 * The virtualised timeline is about 8.6 million pixels tall — roughly 86,000
 * wheel ticks end to end. Ordinary scrolling cannot cross that, so a sustained
 * scroll gradually multiplies its own distance.
 *
 * This is NOT the skip-ahead that used to be in v1. That one jumped over
 * photographs without loading them, so a flick could hide 884 items behind a
 * gap that looked like the end of the archive. Here every pixel of the timeline
 * exists and is accounted for: acceleration only changes how fast you travel
 * across it, never whether anything is there.
 *
 * The ramp is driven by distance already travelled in the current gesture, not
 * by instantaneous velocity. Velocity fires immediately on any sharp movement,
 * which is what made the old behaviour so easy to trigger by accident; distance
 * requires you to have actually committed to a long journey. It also keeps a
 * trackpad — which emits many small deltas — feeling normal for short moves.
 */

// How far you must travel before it starts helping.
const RAMP_START_PX = 1500
// Distance over which the multiplier climbs by one.
const RAMP_PX_PER_X = 2500
const MAX_MULTIPLIER = 14
// Pause longer than this, or reverse, and the ramp resets.
const IDLE_RESET_MS = 260

export function useAcceleratedScroll({ enabled = true } = {}) {
  const state = useRef({ distance: 0, direction: 0, last: 0 })

  useEffect(() => {
    if (!enabled) return
    // Somebody who has asked for less motion has not asked to be flung across
    // a decade of photographs.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const onWheel = e => {
      // Let the browser handle zoom and horizontal gestures untouched.
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

      const now = performance.now()
      const s = state.current
      const dir = Math.sign(e.deltaY)

      if (now - s.last > IDLE_RESET_MS || dir !== s.direction) s.distance = 0
      s.last = now
      s.direction = dir
      s.distance += Math.abs(e.deltaY)

      const over = Math.max(0, s.distance - RAMP_START_PX)
      const multiplier = Math.min(MAX_MULTIPLIER, 1 + over / RAMP_PX_PER_X)

      // Below the ramp this is a no-op, so leave the browser's own scrolling
      // alone — its momentum and smoothing are better than anything done here.
      if (multiplier <= 1.02) return

      e.preventDefault()
      window.scrollBy({ top: e.deltaY * multiplier, behavior: 'auto' })
    }

    // Not passive: it has to be able to preventDefault once the ramp engages.
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [enabled])
}
