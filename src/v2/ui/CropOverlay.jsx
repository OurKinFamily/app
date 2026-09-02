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

export function CropOverlay({
  box, imageRect, onChange, onApply, onCancel, busy,
  angle = 0, onAngle, imageSize,
}) {
  const [drag, setDrag] = useState(null)
  const ref = useRef(null)

  const toFraction = useCallback(e => {
    // Guard the divisor: a zero-width rect turns every coordinate into
    // Infinity, which clamps to 1, which collapses the rectangle to a point.
    const w = imageRect.width || 1
    const h = imageRect.height || 1
    return {
      x: clamp((e.clientX - imageRect.left) / w),
      y: clamp((e.clientY - imageRect.top) / h),
    }
  }, [imageRect])

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
      } else if (drag.mode === 'turn') {
        // The angle between where the pointer started and where it is now,
        // measured from the middle of the picture. Dragging around the corner
        // turns the photograph under a crop box that stays upright, which is
        // how straightening a crooked scan actually feels.
        const cx = imageRect.left + imageRect.width / 2
        const cy = imageRect.top + imageRect.height / 2
        const now = Math.atan2(e.clientY - cy, e.clientX - cx)
        const delta = ((now - drag.from) * 180) / Math.PI
        onAngle(clampAngle(drag.angle + delta))
      } else {
        const next = { ...drag.box }
        if (drag.mode.includes('n')) next.y1 = Math.min(p.y, next.y2 - MIN)
        if (drag.mode.includes('s')) next.y2 = Math.max(p.y, next.y1 + MIN)
        if (drag.mode.includes('w')) next.x1 = Math.min(p.x, next.x2 - MIN)
        if (drag.mode.includes('e')) next.x2 = Math.max(p.x, next.x1 + MIN)
        onChange(next)
      }
    }
    const up = () => {
      // A press with no real drag collapses the box to nothing, and the Crop
      // button then asks the server for a zero-width rectangle — which it
      // rejects, so the click appeared to do nothing at all. Put the previous
      // rectangle back instead.
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
  }, [drag, toFraction, onChange, onAngle, imageRect, angle, box])

  const tooSmall = box.x2 - box.x1 < MIN || box.y2 - box.y1 < MIN

  const style = {
    left: `${box.x1 * 100}%`, top: `${box.y1 * 100}%`,
    width: `${(box.x2 - box.x1) * 100}%`, height: `${(box.y2 - box.y1) * 100}%`,
  }

  return (
    <div
      ref={ref}
      onPointerDown={e => {
        // Only a press on the backdrop starts a new rectangle; presses inside
        // the box or on a handle are moves and resizes, and those stop
        // propagation of their own accord.
        const origin = toFraction(e)
        onChange({ x1: origin.x, y1: origin.y, x2: origin.x, y2: origin.y })
        setDrag({ mode: 'draw', origin, previous: box })
      }}
      style={{
        // Fixed, because the rect is measured against the window. An absolute
        // overlay needs a positioned ancestor and silently renders nowhere
        // when there isn't one.
        position: 'fixed',
        left: imageRect.left, top: imageRect.top,
        width: imageRect.width, height: imageRect.height,
        cursor: 'crosshair', touchAction: 'none', zIndex: 30,
      }}
    >
      {/* Four panes rather than one box-shadow: the dimming has to be BEHIND
          the handles, and a shadow would swallow pointer events. */}
      {/* pointerEvents none, or these swallow the press that starts a new
          rectangle: they cover the whole surface, so the draw handler's
          `e.target === container` was never true and the box could only be
          nudged, never redrawn. */}
      {shades(box).map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', background: 'rgba(0,0,0,.55)',
            pointerEvents: 'none', ...s,
          }}
        />
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

        {onAngle && HANDLES.map(([mode, fx, fy]) => (
          <span
            key={`turn-${mode}`}
            onPointerDown={e => {
              e.stopPropagation()
              const cx = imageRect.left + imageRect.width / 2
              const cy = imageRect.top + imageRect.height / 2
              setDrag({
                mode: 'turn',
                angle,
                from: Math.atan2(e.clientY - cy, e.clientX - cx),
              })
            }}
            title="Drag to straighten"
            style={{
              position: 'absolute',
              left: `${fx * 100}%`, top: `${fy * 100}%`,
              width: 34, height: 34,
              marginLeft: fx ? 4 : -38, marginTop: fy ? 4 : -38,
              cursor: 'grab', borderRadius: 6,
            }}
          />
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

      {/* Pinned to the window, not hung below the photograph. Sitting 52px
          under the image put the buttons off-screen whenever the picture
          reached the bottom of the pane — which is most tall photographs, and
          exactly when you most want to cancel. */}
      <div style={{
        position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
        display: 'flex', gap: 8, alignItems: 'center', zIndex: 40,
      }}>
        {/* What will actually be cut, in real pixels. Useful on its own, and
            it makes a mis-measured overlay obvious instead of mysterious. */}
        {imageSize && (
          <span style={{
            ...bar(false), cursor: 'default',
            fontVariantNumeric: 'tabular-nums', color: C.muted,
          }}>
            {Math.round((box.x2 - box.x1) * imageSize.w)}
            {' × '}
            {Math.round((box.y2 - box.y1) * imageSize.h)}
          </span>
        )}
        {onAngle && (
          <button
            type="button"
            onClick={() => onAngle(0)}
            disabled={!angle}
            title={angle ? 'Back to level' : 'Drag just outside a corner to straighten'}
            style={{
              ...bar(false), minWidth: 92, justifyContent: 'center',
              fontVariantNumeric: 'tabular-nums',
              color: angle ? C.text : C.muted,
              cursor: angle ? 'pointer' : 'default',
            }}
          >
            {angle ? `${angle > 0 ? '+' : ''}${angle.toFixed(1)}°` : '0.0°'}
          </button>
        )}
        <button type="button" onClick={onCancel} style={bar(false)}>
          <X size={15} /> Cancel
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={busy || tooSmall}
          title={tooSmall ? 'Drag out a larger rectangle first' : 'Crop to the rectangle'}
          style={bar(true, busy || tooSmall)}
        >
          <Check size={15} /> {busy ? 'Cropping…' : 'Crop'}
        </button>
      </div>
    </div>
  )
}

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
