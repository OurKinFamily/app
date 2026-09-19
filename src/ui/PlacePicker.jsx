import { useEffect, useState } from 'react'
import { findPlaces, shortPlace } from '../lib/useGroup'
import { C } from './tokens'

/**
 * Where something happened, pinned to real coordinates.
 *
 * The name alone would do for reading, but the coordinates are what let a
 * group appear on the map beside the photographs taken there — which is the
 * moment a list of school classes becomes a childhood.
 */
export function PlacePicker({ value, onChange }) {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])

  useEffect(() => {
    // 350ms rather than the usual 200: this is somebody else's free service,
    // and a request per keystroke is how an archive gets rate-limited.
    const t = setTimeout(() => {
      if (!query.trim()) { setResults([]); return }
      findPlaces(query).then(setResults).catch(() => setResults([]))
    }, query.trim() ? 350 : 0)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); if (value) onChange(null) }}
        placeholder="Somewhere…"
        style={{
          width: '100%', boxSizing: 'border-box', height: 34, padding: '0 11px',
          border: `1px solid ${C.border}`, borderRadius: 9,
          font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
        }}
      />

      {value && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 11.5, color: '#137333' }}>
          {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
          <button
            type="button"
            onClick={() => { onChange(null); setQuery('') }}
            aria-label="Forget this place"
            style={{ border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 13 }}
          >
            ×
          </button>
        </div>
      )}

      {!value && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 38, left: 0, right: 0, zIndex: 30,
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
          boxShadow: '0 6px 24px rgba(0,0,0,.14)', overflow: 'hidden',
        }}>
          {results.map(result => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => {
                const name = shortPlace(result)
                setQuery(name)
                setResults([])
                onChange({ name, lat: parseFloat(result.lat), lng: parseFloat(result.lon) })
              }}
              style={{
                display: 'block', width: '100%', padding: '7px 10px', textAlign: 'left',
                border: 0, background: 'transparent', font: 'inherit', fontSize: 12.5,
                color: C.text, cursor: 'pointer',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {result.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
