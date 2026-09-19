import { useEffect, useRef } from 'react'
import { C } from './tokens'

/**
 * "Are you sure?" — in place, not in a modal.
 *
 * A dialog in the centre of the screen makes you look away from the thing you
 * are about to act on. Confirming next to it keeps the subject in view, which
 * is the only way to notice you had the wrong photograph.
 *
 * Deliberately asymmetric: Cancel is the plain, wide, focused option and the
 * destructive one is smaller and coloured. Escape and a click outside both
 * cancel. Nothing here is a habit worth building muscle memory for.
 */
export function ConfirmPopover({
  message,
  detail,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  align = 'left',
}) {
  const ref = useRef(null)

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel?.() }
    }
    const onDown = e => {
      if (ref.current && !ref.current.contains(e.target)) onCancel?.()
    }
    // Capture: the detail view also listens for Escape to close itself, and
    // dismissing a confirmation should not also close the photograph.
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('mousedown', onDown)
    }
  }, [onCancel])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={message}
      style={{
        position: 'absolute', top: '100%', [align]: 0,
        // Above Leaflet, which stamps z-index 400+ on its map panes and 1000
        // on its controls — the place map was covering the bottom of this.
        zIndex: 1200,
        marginTop: 6, width: 236, padding: 12,
        background: C.bg, color: C.text,
        border: `1px solid ${C.border}`, borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,.18)',
        textAlign: 'left',
      }}
    >
      <div style={{ fontSize: 13, marginBottom: detail ? 4 : 12 }}>{message}</div>
      {detail && (
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12 }}>{detail}</div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          autoFocus
          style={{
            height: 30, padding: '0 14px', borderRadius: 15,
            border: `1px solid ${C.border}`, background: C.bg,
            color: C.text, fontSize: 13, cursor: 'pointer',
          }}
        >
          No
        </button>
        <button
          type="button"
          onClick={onConfirm}
          style={{
            height: 30, padding: '0 14px', borderRadius: 15, border: 0,
            background: '#d93025', color: '#fff',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
