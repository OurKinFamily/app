import { useEffect } from 'react'

/**
 * Turning pointer movement into a crop rectangle.
 *
 * Four gestures share one pair of listeners: drawing a new rectangle, moving
 * the whole thing, pulling an edge or corner, and turning the photograph. They
 * are told apart by the mode recorded when the press started — once the
 * pointer is down the gesture cannot change its mind.
 *
 * Everything is in fractions of the displayed image, so the rectangle survives
 * the window being resized and becomes pixels only when it is sent.
 */

export const MIN = 0.04

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))

// Beyond this it stops being straightening and becomes a rotation, which the
// lossless quarter-turn button already does properly.
const clampAngle = a => Math.max(-45, Math.min(45, Math.round(a * 10) / 10))

function normalise(a, b) {
  return {
    x1: Math.min(a.x, b.x), y1: Math.min(a.y, b.y),
    x2: Math.max(a.x, b.x), y2: Math.max(a.y, b.y),
  }
}

export function useCropDrag({
  drag, setDrag, box, onChange, onAngle, angle, imageRect, toFraction,
}) {
  useEffect(() => {
    if (!drag) return

    const move = e => {
      // Stop the browser selecting the photograph as if it were text. Without
      // it, dragging a handle paints the blue selection over everything.
      e.preventDefault()
      const p = toFraction(e)

      if (drag.mode === 'draw') {
        onChange(normalise(drag.origin, p))
        return
      }

      if (drag.mode === 'move') {
        const w = drag.box.x2 - drag.box.x1
        const h = drag.box.y2 - drag.box.y1
        const x1 = clamp(p.x - drag.grab.x, 0, 1 - w)
        const y1 = clamp(p.y - drag.grab.y, 0, 1 - h)
        onChange({ x1, y1, x2: x1 + w, y2: y1 + h })
        return
      }

      if (drag.mode === 'turn') {
        // The angle between where the pointer started and where it is now,
        // measured from the middle of the picture. Dragging around a corner
        // turns the photograph under a crop box that stays upright, which is
        // how straightening a crooked scan actually feels.
        const cx = imageRect.left + imageRect.width / 2
        const cy = imageRect.top + imageRect.height / 2
        const now = Math.atan2(e.clientY - cy, e.clientX - cx)
        onAngle(clampAngle(drag.angle + ((now - drag.from) * 180) / Math.PI))
        return
      }

      // An edge or a corner. A corner is simply two edges at once, so reading
      // the compass letters out of the mode covers both.
      const next = { ...drag.box }
      if (drag.mode.includes('n')) next.y1 = Math.min(p.y, next.y2 - MIN)
      if (drag.mode.includes('s')) next.y2 = Math.max(p.y, next.y1 + MIN)
      if (drag.mode.includes('w')) next.x1 = Math.min(p.x, next.x2 - MIN)
      if (drag.mode.includes('e')) next.x2 = Math.max(p.x, next.x1 + MIN)
      onChange(next)
    }

    const up = () => {
      // A press with no real drag collapses the box to nothing, and the Crop
      // button then asks for a zero-width rectangle — which the server
      // refuses, so the click appears to do nothing. Put the old one back.
      if (drag.mode === 'draw' && drag.previous
          && (box.x2 - box.x1 < MIN || box.y2 - box.y1 < MIN)) {
        onChange(drag.previous)
      }
      setDrag(null)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [drag, setDrag, box, toFraction, onChange, onAngle, angle, imageRect])
}
