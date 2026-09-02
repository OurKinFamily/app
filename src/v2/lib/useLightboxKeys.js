import { useEffect } from 'react'

/**
 * Escape closes, arrows move between photographs.
 *
 * Guarded against fields, because the panel behind this holds a description
 * box, a date picker and a person search — and a left arrow while somebody is
 * typing a name should move the cursor, not the photograph.
 */
export function useLightboxKeys({ onClose, onPrev, onNext, hasPrev, hasNext }) {
  useEffect(() => {
    const onKey = e => {
      if (e.target.matches?.('input, textarea, select, [contenteditable]')) return
      if (e.key === 'Escape') onClose?.()
      else if (e.key === 'ArrowLeft' && hasPrev) { e.preventDefault(); onPrev?.() }
      else if (e.key === 'ArrowRight' && hasNext) { e.preventDefault(); onNext?.() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])
}
