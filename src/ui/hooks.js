import { useEffect, useRef, useState } from 'react'

/**
 * Press-and-hold, for entering selection mode on touch.
 *
 * Returns handlers to spread onto the pressed element, plus `consume()`, which
 * a click handler must call first: the browser fires a click after a long
 * press, and without swallowing it a long press would both enter selection mode
 * and open the photo. It reports whether a press just fired and clears the flag
 * in one go, so the caller never has to reach into the hook's internals.
 */
export function useLongPress(onLongPress, { ms = 450, tolerance = 10 } = {}) {
  const timer = useRef(null)
  const fired = useRef(false)
  const origin = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const cancel = () => clearTimeout(timer.current)

  return {
    consume: () => {
      const fired_ = fired.current
      fired.current = false
      return fired_
    },
    handlers: !onLongPress ? {} : {
      onPointerDown: e => {
        fired.current = false
        origin.current = { x: e.clientX, y: e.clientY }
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          fired.current = true
          onLongPress()
        }, ms)
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      // A drag is a scroll, not a press. Without this, scrolling a phone with a
      // finger resting on a photo drops you into selection mode.
      onPointerMove: e => {
        const o = origin.current
        if (!o) return
        if (Math.abs(e.clientX - o.x) > tolerance ||
            Math.abs(e.clientY - o.y) > tolerance) cancel()
      },
    },
  }
}

/**
 * Whether the viewer has asked for less motion.
 *
 * Honoured rather than assumed: vestibular disorders make transform and scale
 * animations genuinely unpleasant, and the setting exists so people don't have
 * to explain that to every website.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = e => setReduced(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  return reduced
}
