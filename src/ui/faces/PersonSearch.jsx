import { useEffect, useState } from 'react'
import { Avatar } from '../Avatar'
import { searchPeople } from '../../lib/api'
import { displayName } from '../../lib/people'
import { mediaUrl } from '../../lib/media'
import { C } from '../tokens'

/**
 * Find the person these faces belong to.
 *
 * Shows how many photographs each match already has. Two people can share a
 * name in a family — a grandfather and a grandson — and the count is usually
 * what tells them apart when the archive is thin on dates.
 */
export function PersonSearch({ placeholder = 'Who is this?', onPick, disabled }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    // The clear runs on the same timer as the search rather than immediately:
    // emptying the box is a state change like any other, and doing it in the
    // effect body starts a second render before this one has painted.
    const t = setTimeout(() => {
      if (!query.trim()) { setResults([]); return }
      searchPeople(query).then(setResults).catch(() => setResults([]))
    }, query.trim() ? 200 : 0)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%', boxSizing: 'border-box', height: 32, padding: '0 10px',
          border: `1px solid ${C.border}`, borderRadius: 8,
          font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
        }}
      />

      {results.length > 0 && (
        <div style={{
          position: 'absolute', top: 36, left: 0, right: 0, zIndex: 20,
          maxHeight: 210, overflowY: 'auto',
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
          boxShadow: '0 6px 24px rgba(0,0,0,.14)',
        }}>
          {results.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onPick(p); setQuery(''); setResults([]) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '6px 8px', border: 0, background: 'transparent',
                font: 'inherit', fontSize: 13, color: C.text,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <Avatar name={displayName(p)} src={p.avatar ? mediaUrl(p.avatar) : null} size={22} />
              <span style={{ flex: 1, minWidth: 0 }}>{displayName(p)}</span>
              {p.photo_count > 0 && (
                <span style={{ fontSize: 11, color: C.muted }}>
                  {p.photo_count.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
