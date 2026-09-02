import { useState } from 'react'
import { Check, Eye, X } from 'lucide-react'
import { C } from './tokens'

/**
 * The restored photograph, before it becomes the photograph.
 *
 * The restored one fills the frame and the original is a button-press behind
 * it. The changes are dust, scratches and grain — too small to see side by
 * side, and a slider only tells you where the boundary is. Flicking the whole
 * picture between the two states in one place is how you actually tell whether
 * a scratch went away or a face turned to plastic.
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
  // The restored one, with the original shown only while the button is HELD.
  // Holding and letting go is the gesture that matches the question: it puts
  // the two states in the same place a moment apart, and returns you to the
  // one you are deciding about rather than leaving you in the other.
  const [showOriginal, setShowOriginal] = useState(false)

  return (
    <div
      style={{
        ...sheet,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 16, boxSizing: 'border-box', gap: 12,
      }}
    >
      <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, margin: 0 }}>
        {showOriginal ? 'The original' : 'Restored'} — nothing is saved until you keep it.
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
          {/* Laid exactly over the original rather than swapped in, so the two
              cannot shift by a pixel as they change — the pipeline alters the
              dimensions slightly, and a picture that jumps hides the very
              differences you are looking for. */}
          <img
            src={after}
            alt="After"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              visibility: showOriginal ? 'hidden' : 'visible',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          // Held, not toggled. Pointer events rather than mouse ones so a
          // finger works the same; leaving the button counts as letting go,
          // or dragging off it would strand the original on screen.
          onPointerDown={() => setShowOriginal(true)}
          onPointerUp={() => setShowOriginal(false)}
          onPointerLeave={() => setShowOriginal(false)}
          onPointerCancel={() => setShowOriginal(false)}
          style={{
            ...button(false),
            background: showOriginal ? 'rgba(255,255,255,.18)' : 'transparent',
          }}
        >
          <Eye size={15} /> Hold for original
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
