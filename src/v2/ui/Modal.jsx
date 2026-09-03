import { useEffect } from 'react'
import { X } from 'lucide-react'
import { C } from './tokens'

/**
 * The shell every v2 dialog sits in.
 *
 * One of these so the four v1 modals stop being four different dialogs. They
 * were written for the dark theme and looked like holes cut in the page when
 * they opened over v2 — which is how a modal reads when it belongs to another
 * design.
 *
 * Escape closes, and so does a click on the backdrop. Both are what people try
 * first, and a dialog that ignores them feels stuck.
 */
export function Modal({ title, onClose, children, footer, width = 460 }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1400,
        display: 'grid', placeItems: 'center', padding: 16,
        background: 'rgba(32,33,36,.5)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: `min(${width}px, calc(100vw - 32px))`,
          maxHeight: 'min(82vh, 760px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: C.bg, borderRadius: 14,
          boxShadow: '0 8px 40px rgba(0,0,0,.25)',
        }}
      >
        <header style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
        }}>
          <h2 style={{ flex: 1, fontSize: 15, fontWeight: 500, margin: 0 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'grid', placeItems: 'center', width: 30, height: 30,
              border: 0, borderRadius: '50%', background: 'transparent',
              color: C.muted, cursor: 'pointer',
            }}
          >
            <X size={17} />
          </button>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
          {children}
        </div>

        {footer && (
          <footer style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            padding: '12px 16px', borderTop: `1px solid ${C.border}`,
          }}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
