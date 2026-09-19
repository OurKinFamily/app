import { useCallback, useState } from 'react'
import { Check, X } from 'lucide-react'
import { MIN, useCropDrag } from '../lib/useCropDrag'
import { C } from './tokens'

/**
 * Drawing the rectangle to crop to.
 *
 * Drag the backdrop to draw a new one; drag inside to move it; drag a corner
 * or an edge to resize; drag just outside a corner to straighten. Everything
 * outside the rectangle is dimmed, because the question a crop asks is not
 * "what is selected" but "what will be left".
 *
 * Coordinates are fractions of the displayed image, converted to real pixels
 * only when sent. The API takes it from there — the file underneath may be
 * stored sideways.
 */

const CORNERS = [['nw', 0, 0], ['ne', 1, 0], ['se', 1, 1], ['sw', 0, 1]]

// Mid-edge handles, for moving one side without disturbing the other three.
const EDGES = [
  ['n', 0.5, 0, 'ns-resize'],
  ['s', 0.5, 1, 'ns-resize'],
  ['w', 0, 0.5, 'ew-resize'],
  ['e', 1, 0.5, 'ew-resize'],
]

export function CropOverlay({
  box, imageRect, onChange, onApply, onCancel, busy,
  angle = 0, onAngle, imageSize,
}) {
  const [drag, setDrag] = useState(null)

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

  useCropDrag({ drag, setDrag, box, onChange, onAngle, angle, imageRect, toFraction })

  const tooSmall = box.x2 - box.x1 < MIN || box.y2 - box.y1 < MIN
  const style = {
    left: `${box.x1 * 100}%`, top: `${box.y1 * 100}%`,
    width: `${(box.x2 - box.x1) * 100}%`, height: `${(box.y2 - box.y1) * 100}%`,
  }

  return (
    <div
      onPointerDown={e => {
        // Only the backdrop starts a new rectangle; presses inside the box or
        // on a handle stop propagation of their own accord.
        e.preventDefault()
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
        // No text selection while cropping: dragging a handle otherwise
        // paints the browser's blue selection across the photograph.
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      {/* pointerEvents none, or these swallow the press that starts a new
          rectangle: they cover the whole surface. */}
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
          e.preventDefault()
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

        {onAngle && CORNERS.map(([mode, fx, fy]) => (
          <span
            key={`turn-${mode}`}
            onPointerDown={e => {
              e.stopPropagation()
              e.preventDefault()
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

        {EDGES.map(([mode, fx, fy, cursor]) => {
          const vertical = mode === 'n' || mode === 's'
          return (
            <span
              key={mode}
              onPointerDown={e => {
                e.stopPropagation()
                e.preventDefault()
                setDrag({ mode, box })
              }}
              title="Drag this side"
              style={{
                position: 'absolute',
                left: `${fx * 100}%`, top: `${fy * 100}%`,
                // Long along the edge, thin across it: a bar says "this side
                // moves", where another square would read as a corner.
                width: vertical ? 30 : 12,
                height: vertical ? 12 : 30,
                marginLeft: vertical ? -15 : -6,
                marginTop: vertical ? -6 : -15,
                borderRadius: 3, background: '#fff', cursor,
                boxShadow: '0 1px 4px rgba(0,0,0,.5)',
              }}
            />
          )
        })}

        {CORNERS.map(([mode, fx, fy]) => (
          <span
            key={mode}
            onPointerDown={e => {
              e.stopPropagation()
              e.preventDefault()
              setDrag({ mode, box })
            }}
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

      {/* Pinned to the window, not hung below the photograph. Sitting under
          the image put these off-screen for any picture reaching the bottom of
          the pane — exactly when you most want Cancel. */}
      <div style={{
        position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
        display: 'flex', gap: 8, alignItems: 'center', zIndex: 40,
      }}>
        {imageSize?.w > 0 && (
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
