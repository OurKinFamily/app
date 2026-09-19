import { useEffect, useRef, useState } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import { C } from './tokens'

/**
 * Naming a face.
 *
 * The single highest-value action in the archive — a photograph nobody is
 * tagged in is a picture, and one with names on it is a record. So it is one
 * click from the face itself rather than buried in a management page.
 *
 * Two ways out: an existing person, or a new one. The second matters more than
 * it looks. Coming across a face you can name is exactly the moment you learn
 * a relative exists, and being told to go and create them somewhere else first
 * is how tagging stops happening.
 */
export function FaceAssigner({ face, onAssign, onCreate, onClose, onOutside }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState(false)
  const timer = useRef(null)
  const boxRef = useRef(null)

  // Clicking away closes it, and Escape does too. An open panel that only
  // shuts via its own ✕ is a panel people leave open by accident.
  useEffect(() => {
    const onDown = e => {
      if (boxRef.current && !boxRef.current.contains(e.target)) onOutside?.()
    }
    const onKey = e => {
      // Capture, so dismissing this does not also close the photograph.
      if (e.key === 'Escape') { e.stopPropagation(); onOutside?.() }
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [onOutside])

  const q = query.trim()

  useEffect(() => {
    clearTimeout(timer.current)
    if (q.length < 2) return
    timer.current = setTimeout(() => {
      setSearching(true)
      fetch(`/api/people/search?q=${encodeURIComponent(q)}`)
        .then(r => (r.ok ? r.json() : []))
        .then(d => setResults(Array.isArray(d) ? d : (d.results || d.people || [])))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(timer.current)
  }, [q])

  const shown = q.length < 2 ? [] : results

  const run = async fn => {
    if (busy) return
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  return (
    <div
      ref={boxRef}
      style={{
        position: 'relative', zIndex: 1200,
        border: `1px solid ${C.border}`, borderRadius: 8,
        padding: 10, margin: '8px 0', background: C.surface,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {face?.crop_url && (
          <img
            src={face.crop_url}
            alt=""
            style={{ width: 40, height: 40, borderRadius: 5, objectFit: 'cover' }}
          />
        )}
        <span style={{ fontSize: 13, flex: 1 }}>Who is this?</span>
        <button
          type="button"
          aria-label="Cancel"
          onClick={onClose}
          style={{
            display: 'grid', placeItems: 'center', width: 24, height: 24,
            border: 0, borderRadius: '50%', background: 'transparent',
            color: C.muted, cursor: 'pointer',
          }}
        >
          <X size={15} />
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 8, top: 9, color: C.muted }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search people"
          autoFocus
          aria-label="Search people"
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${focused ? C.activeText : C.border}`,
            borderRadius: 4, padding: '6px 8px 6px 26px', fontSize: 13,
            color: C.text, background: C.bg, outline: 'none',
            boxShadow: focused ? `0 0 0 2px ${C.activeBg}` : undefined,
            transition: 'border-color 120ms ease, box-shadow 120ms ease',
          }}
        />
      </div>

      {searching && (
        <div style={{ fontSize: 12, color: C.muted, padding: '6px 4px' }}>Searching…</div>
      )}

      {shown.length > 0 && (
        <div style={{ display: 'grid', marginTop: 6 }}>
          {shown.slice(0, 6).map(p => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => run(() => onAssign?.(p))}
              onMouseEnter={e => { e.currentTarget.style.background = C.hover }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                textAlign: 'left', border: 0, background: 'transparent',
                padding: '6px 4px', borderRadius: 4, cursor: 'pointer',
                fontSize: 12.5, color: C.text,
              }}
            >
              {p.avatar
                ? <img src={`/api/media/${p.avatar}`} alt="" style={{
                    width: 26, height: 26, borderRadius: '50%', objectFit: 'cover',
                    flex: '0 0 auto',
                  }} />
                : <span style={{
                    width: 26, height: 26, borderRadius: '50%', background: C.hover,
                    flex: '0 0 auto',
                  }} />}
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name}
                {/* Dates disambiguate the three Henrys this family contains. */}
                {p.birth_date && (
                  <span style={{ color: C.muted }}> · {p.birth_date.slice(0, 4)}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Always offered, not just when the search comes up empty: the name you
          are about to type may match somebody else's spelling by accident. */}
      {q.length >= 2 && !searching && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => onCreate?.(q))}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            textAlign: 'left', border: 0, background: 'transparent',
            padding: '8px 4px', marginTop: 4, cursor: 'pointer',
            fontSize: 12.5, color: C.activeText,
            borderTop: shown.length ? `1px solid ${C.border}` : 'none',
          }}
        >
          <UserPlus size={15} />
          Add “{q}” as a new person
        </button>
      )}
    </div>
  )
}
