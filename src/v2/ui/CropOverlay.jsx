import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { C } from './tokens'

/**
 * Drawing the rectangle to crop to.
 *
 * Drag anywhere to draw a new one; drag inside to move it; drag a corner to
 * resize. Everything outside is dimmed, because the question is not "what is
 * selected" but "what will be left".
 *
 * Coordinates are kept as FRACTIONS of the displayed image, so the rectangle
 * survives the window being resized and converts to real pixels only when it
 * is sent. The API expects pixels of the displayed image; it deals with the
 * fact that the file underneath may be stored sideways.
 */

const HANDLES = [['nw', 0, 0], ['ne', 1, 0], ['se', 1, 1], ['sw', 0, 1]]
const MIN = 0.04

export function CropOverlay({ box, imageRect, onChange, onApply, onCancel, busy }) {
  const [drag, setDrag] = useState(null)
  const ref = useRef(null)

  const toFraction = useCallback(e => ({
    x: clamp((e.clientX - imageRect.left) / imageRect.width),
    y: clamp((e.clientY - imageRect.top) / imageRect.height),
  }), [imageRect])

  useEffect(() => {
    if (!drag) return
    const move = e => {
      const p = toFraction(e)
      if (drag.mode === 'draw') {
        onChange(normalise(drag.origin, p))
      } else if (drag.mode === 'move') {
        const w = drag.box.x2 - drag.box.x1
        const h = drag.box.y2 - drag.box.y1
        const x1 = clamp(p.x - drag.grab.x, 0, 1 - w)
        const y1 = clamp(p.y - drag.grab.y, 0, 1 - h)
        onChange({ x1, y1, x2: x1 + w, y2: y1 + h })
      } else {
        const next = { ...drag.box }
        if (drag.mode.includes('n')) next.y1 = Math.min(p.y, next.y2 - MIN)
        if (drag.mode.includes('s')) next.y2 = Math.max(p.y, next.y1 + MIN)
        if (drag.mode.includes('w')) next.x1 = Math.min(p.x, next.x2 - MIN)
        if (drag.mode.includes('e')) next.x2 = Math.max(p.x, next.x1 + MIN)
        onChange(next)
      }
    }
    const up = () => setDrag(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [drag, toFraction, onChange])

  const style = {
    left: `${box.x1 * 100}%`, top: `${box.y1 * 100}%`,
    width: `${(box.x2 - box.x1) * 100}%`, height: `${(box.y2 - box.y1) * 100}%`,
  }

  return (
    <div
      ref={ref}
      onPointerDown={e => {
        if (e.target !== ref.current) return
        const origin = toFraction(e)
        onChange({ x1: origin.x, y1: origin.y, x2: origin.x, y2: origin.y })
        setDrag({ mode: 'draw', origin })
      }}
      style={{
        position: 'absolute',
        left: imageRect.left, top: imageRect.top,
        width: imageRect.width, height: imageRect.height,
        cursor: 'crosshair', touchAction: 'none', zIndex: 30,
      }}
    >
      {/* Four panes rather than one box-shadow: the dimming has to be BEHIND
          the handles, and a shadow would swallow pointer events. */}
      {shades(box).map((s, i) => (
        <div key={i} style={{ position: 'absolute', background: 'rgba(0,0,0,.55)', ...s }} />
      ))}

      <div
        onPointerDown={e => {
          e.stopPropagation()
          const p = toFraction(e)
          setDrag({ mode: 'move', box, grab: { x: p.x - box.x1, y: p.y - box.y1 } })
        }}
        style={{
          position: 'absolute', ...style, cursor: 'move',
          outline: '1px solid rgba(255,255,255,.9)',
        }}
      >
        {/* Thirds. The eye places a horizon or a face on these lines without
            being told to, which is most of what a crop is for. */}
        {[1, 2].map(n => (
          <div key={`h${n}`} style={guide({ top: `${(n / 3) * 100}%`, width: '100%', height: 1 })} />
        ))}
        {[1, 2].map(n => (
          <div key={`v${n}`} style={guide({ left: `${(n / 3) * 100}%`, height: '100%', width: 1 })} />
        ))}

        {HANDLES.map(([mode, fx, fy]) => (
          <span
            key={mode}
            onPointerDown={e => { e.stopPropagation(); setDrag({ mode, box }) }}
            style={{
              position: 'absolute',
              left: `${fx * 100}%`, top: `${fy * 100}%`,
              width: 16, height: 16, marginLeft: -8, marginTop: -8,
              borderRadius: 3, background: '#fff', cursor: `${mode}-resize`,
              boxShadow: '0 1px 4px rgba(0,0,0,.5)',
            }}
          />
        ))}
      </div>

      <div style={{
        position: 'absolute', left: '50%', bottom: -52, transform: 'translateX(-50%)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <button type="button" onClick={onCancel} style={bar(false)}>
          <X size={15} /> Cancel
        </button>
        <button type="button" onClick={onApply} disabled={busy} style={bar(true, busy)}>
          <Check size={15} /> {busy ? 'Cropping…' : 'Crop'}
        </button>
      </div>
    </div>
  )
}

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))

function normalise(a, b) {
  return {
    x1: Math.min(a.x, b.x), y1: Math.min(a.y, b.y),
    x2: Math.max(a.x, b.x), y2: Math.max(a.y, b.y),
  }
}

/** The four regions outside the rectangle, as percentages. */
function shades({ x1, y1, x2, y2 }) {
  const pc = v => `${v * 100}%`
  return [
    { left: 0, top: 0, width: '100%', height: pc(y1) },
    { left: 0, top: pc(y2), width: '100%', bottom: 0 },
    { left: 0, top: pc(y1), width: pc(x1), height: pc(y2 - y1) },
    { left: pc(x2), top: pc(y1), right: 0, height: pc(y2 - y1) },
  ]
}

const guide = extra => ({
  position: 'absolute', background: 'rgba(255,255,255,.35)',
  pointerEvents: 'none', ...extra,
})

const bar = (primary, busy) => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 34, padding: '0 16px', borderRadius: 17, fontSize: 13,
  border: primary ? 0 : `1px solid ${C.border}`,
  background: primary ? C.activeText : C.bg,
  color: primary ? '#fff' : C.text,
  cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
})
