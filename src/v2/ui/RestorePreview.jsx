import { useState } from 'react'
import { Check, Eye, X } from 'lucide-react'
import { C } from './tokens'

/**
 * The restored photograph, before it becomes the photograph.
 *
 * A slider rather than side-by-side: the changes are dust, scratches and
 * grain, and at half width on a phone you cannot see any of them. Dragging the
 * divider over the same patch of sky is how you actually tell whether a
 * scratch went away or a face turned to plastic.
 *
 * Nothing is written until Keep is pressed. Discard leaves the original
 * exactly as it was, because it was never touched.
 */
export function RestorePreview({
  before, after, busy, pending, error, onKeep, onDiscard, onDismissError,
}) {
  if (error) {
    return (
      <div style={{ ...sheet, display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ maxWidth: '46ch', textAlign: 'center' }}>
          <p style={{ color: '#f28b82', fontSize: 14, margin: '0 0 6px' }}>
            Could not restore this one
          </p>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </p>
          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, marginTop: 10 }}>
            The photograph is untouched.
          </p>
          <button type="button" onClick={onDismissError} style={{ ...button(false), marginTop: 16 }}>
            Close
          </button>
        </div>
      </div>
    )
  }
  if (pending) {
    return (
      <div style={{ ...sheet, display: 'grid', placeItems: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,.8)', fontSize: 14 }}>
          Restoring… this takes about fifteen seconds.
        </p>
      </div>
    )
  }
  return <Comparison {...{ before, after, busy, onKeep, onDiscard }} />
}

function Comparison({ before, after, busy, onKeep, onDiscard }) {
  // Held down, the restored one is hidden entirely. Flicking between the two
  // in the same spot is how the eye catches what actually changed — a slider
  // shows both at once, which is a different question.
  const [showOriginal, setShowOriginal] = useState(false)
  const [split, setSplit] = useState(50)

  return (
    <div
      style={{
        ...sheet,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 16, boxSizing: 'border-box', gap: 12,
      }}
    >
      <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, margin: 0 }}>
        Drag to compare. Nothing is saved until you keep it.
      </p>

      <div style={{
        position: 'relative', flex: 1, minHeight: 0,
        display: 'grid', placeItems: 'center', width: '100%',
      }}>
        <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
          <img
            src={before}
            alt="Before"
            style={{ display: 'block', maxWidth: '100%', maxHeight: '72vh' }}
          />
          {/* The restored one on top, revealed from the left. Same box, so the
              two line up even though the pipeline changes the size slightly. */}
          <img
            src={after}
            alt="After"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              clipPath: `inset(0 ${100 - split}% 0 0)`,
              visibility: showOriginal ? 'hidden' : 'visible',
            }}
          />
          {!showOriginal && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: `${split}%`,
              width: 2, background: '#fff', pointerEvents: 'none',
              boxShadow: '0 0 8px rgba(0,0,0,.6)',
            }} />
          )}
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={e => setSplit(Number(e.target.value))}
            aria-label="Compare before and after"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              opacity: 0, cursor: 'ew-resize', margin: 0,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,.45)', fontSize: 11.5, marginRight: 6 }}>
          {split < 50 ? 'Mostly original' : 'Mostly restored'}
        </span>
        <button
          type="button"
          // Press and hold. Pointer events rather than mouse: the same code
          // covers a finger held on the screen. Leaving the button counts as
          // letting go, or dragging off it would leave the original stuck on.
          onPointerDown={() => setShowOriginal(true)}
          onPointerUp={() => setShowOriginal(false)}
          onPointerLeave={() => setShowOriginal(false)}
          onPointerCancel={() => setShowOriginal(false)}
          style={{
            ...button(false),
            background: showOriginal ? 'rgba(255,255,255,.18)' : 'transparent',
          }}
        >
          <Eye size={15} /> {showOriginal ? 'Original' : 'Hold for original'}
        </button>
        <button type="button" onClick={onDiscard} disabled={busy} style={button(false)}>
          <X size={15} /> Discard
        </button>
        <button type="button" onClick={onKeep} disabled={busy} style={button(true, busy)}>
          <Check size={15} /> {busy ? 'Saving…' : 'Keep it'}
        </button>
      </div>
    </div>
  )
}

const sheet = {
  position: 'fixed', inset: 0, zIndex: 1400,
  background: 'rgba(16,17,19,.96)',
}

const button = (primary, busy) => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 36, padding: '0 18px', borderRadius: 18, fontSize: 13,
  border: primary ? 0 : '1px solid rgba(255,255,255,.25)',
  background: primary ? C.activeText : 'transparent',
  color: '#fff', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
})
