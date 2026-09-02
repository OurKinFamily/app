import { useEffect, useRef, useState } from 'react'
import { MapPin, Bookmark, Search } from 'lucide-react'
import { C } from './tokens'
import { prettyPlace } from './prettyPlace'

/**
 * Correcting where a photograph was taken.
 *
 * Three ways in, in the order they're actually useful:
 *
 *   1. Saved places — the handful of spots most of a family archive happens in.
 *      "cottage", "haverhill-house", "timberlane". Typing a name beats
 *      remembering a coordinate every time.
 *   2. Search — geocoding, for somewhere that isn't a regular haunt.
 *   3. Coordinates — for a scan being placed from a map, or when the search
 *      finds the wrong Haverhill (there are at least three).
 *
 * Unlike a redate, this writes through: the API puts the coordinates on the
 * Neo4j node, the .json sidecar, and the file's own EXIF, so a corrected place
 * survives re-extraction and travels with the file.
 */
export function LocationEditor({ lat, lng, onSave, onCancel }) {
  const [query, setQuery] = useState('')
  const [shortcuts, setShortcuts] = useState([])
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  // Results are biased to New England, which is right nearly always and wrong
  // for a holiday. "austin" otherwise finds Austin, Rhode Island.
  const [anywhere, setAnywhere] = useState(false)
  const [manual, setManual] = useState(
    lat != null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : '',
  )
  const [focused, setFocused] = useState(null)
  const [saving, setSaving] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    fetch('/api/gallery/place-shortcuts')
      .then(r => (r.ok ? r.json() : []))
      .then(setShortcuts)
      .catch(() => {})
  }, [])

  // Debounced: geocoding is a network call per keystroke otherwise, and the
  // provider will rate-limit long before the user finishes typing.
  // Derived during render rather than in the effect: a query too short to
  // search has no results by definition, and clearing them from an effect
  // costs a second render pass every keystroke.
  const tooShort = query.trim().length < 2
  const shown = tooShort ? null : results

  useEffect(() => {
    clearTimeout(timer.current)
    const q = query.trim()
    if (q.length < 2) return
    timer.current = setTimeout(() => {
      setSearching(true)
      fetch(`/api/gallery/geocode?q=${encodeURIComponent(q)}${anywhere ? '&anywhere=true' : ''}`)
        .then(r => (r.ok ? r.json() : []))
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(timer.current)
  }, [query, anywhere])

  const commit = async (latitude, longitude, place_name) => {
    if (saving) return
    setSaving(true)
    try {
      await onSave?.({ latitude, longitude, place_name })
    } finally {
      setSaving(false)
    }
  }

  const saveManual = e => {
    e.preventDefault()
    // Accepts "42.77, -71.07" however it's spaced — people paste these from
    // all sorts of places.
    const [a, b] = manual.split(',').map(v => parseFloat(v.trim()))
    if (Number.isNaN(a) || Number.isNaN(b)) return
    commit(a, b, null)
  }

  const q = query.trim().toLowerCase()
  const matchingShortcuts = shortcuts.filter(
    s => !q || s.name.includes(q) || prettyPlace(s.name).toLowerCase().includes(q),
  )

  const field = name => ({
    width: '100%', boxSizing: 'border-box',
    border: `1px solid ${focused === name ? C.activeText : C.border}`,
    borderRadius: 4, padding: '6px 8px', fontSize: 13,
    color: C.text, background: C.bg, outline: 'none',
    boxShadow: focused === name ? `0 0 0 2px ${C.activeBg}` : undefined,
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
  })
  const focusProps = name => ({
    onFocus: () => setFocused(name),
    onBlur: () => setFocused(null),
  })

  const option = {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', textAlign: 'left',
    border: 0, background: 'transparent', cursor: 'pointer',
    padding: '6px 4px', fontSize: 12.5, color: C.text,
    borderRadius: 4,
  }

  return (
    <div style={{ display: 'grid', gap: 8, padding: '4px 0 10px' }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={14}
          style={{ position: 'absolute', left: 8, top: 9, color: C.muted }}
        />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search saved places or anywhere"
          style={{ ...field('q'), paddingLeft: 26 }}
          {...focusProps('q')}
          autoFocus
          aria-label="Search for a place"
        />
      </div>

      {matchingShortcuts.length > 0 && (
        <div style={{ display: 'grid' }}>
          {matchingShortcuts.slice(0, 6).map(s => (
            <button
              key={s.name}
              type="button"
              style={option}
              onClick={() => commit(s.latitude, s.longitude, s.name)}
              onMouseEnter={e => { e.currentTarget.style.background = C.hover }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {/* Saved places are marked, so a familiar name is obviously the
                  known one rather than a coincidental search hit. */}
              <Bookmark size={13} style={{ color: C.activeText, flex: '0 0 auto' }} />
              {prettyPlace(s.name)}
            </button>
          ))}
        </div>
      )}

      {searching && (
        <div style={{ fontSize: 12, color: C.muted, padding: '2px 4px' }}>Searching…</div>
      )}

      {shown?.length > 0 && (
        <div style={{ display: 'grid', borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
          {shown.slice(0, 5).map(r => (
            <button
              key={r.display_name}
              type="button"
              style={option}
              onClick={() => commit(r.latitude, r.longitude, r.display_name.split(',')[0])}
              onMouseEnter={e => { e.currentTarget.style.background = C.hover }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <MapPin size={13} style={{ color: C.muted, flex: '0 0 auto' }} />
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.display_name}
              </span>
            </button>
          ))}
        </div>
      )}

      {shown?.length === 0 && !searching && (
        <div style={{ fontSize: 12, color: C.muted, padding: '2px 4px' }}>
          Nothing found. Coordinates below still work.
        </div>
      )}

      {shown && !anywhere && (
        <button
          type="button"
          onClick={() => setAnywhere(true)}
          style={{
            justifySelf: 'start', border: 0, background: 'transparent',
            color: C.activeText, fontSize: 12, cursor: 'pointer', padding: '2px 4px',
          }}
        >
          Search anywhere instead
        </button>
      )}
      {anywhere && (
        <div style={{ fontSize: 11.5, color: C.muted, padding: '2px 4px' }}>
          Searching worldwide.{' '}
          <button
            type="button"
            onClick={() => setAnywhere(false)}
            style={{
              border: 0, background: 'transparent', color: C.activeText,
              fontSize: 11.5, cursor: 'pointer', padding: 0,
            }}
          >
            Back to nearby
          </button>
        </div>
      )}

      <form onSubmit={saveManual} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={manual}
          onChange={e => setManual(e.target.value)}
          placeholder="42.771948, -71.065564"
          style={field('manual')}
          {...focusProps('manual')}
          aria-label="Coordinates"
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            height: 30, padding: '0 14px', borderRadius: 15, border: 0,
            background: C.activeBg, color: C.activeText,
            fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
            cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1,
          }}
        >
          Set
        </button>
      </form>

      <button
        type="button"
        onClick={onCancel}
        style={{
          justifySelf: 'end', height: 28, padding: '0 12px',
          border: 0, background: 'transparent', color: C.muted,
          fontSize: 13, cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  )
}
