import { useEffect, useState } from 'react'
import { Avatar } from './Avatar'
import { TYPE_ROLES } from '../lib/circleTypes'
import { displayName, otherName } from '../../lib/people'
import { mediaUrl } from '../../lib/media'
import { C } from './tokens'

/**
 * Putting several people into a circle at once.
 *
 * Several, because that is how it happens: a class photograph is fourteen
 * names in one sitting, and doing them one at a time makes it a chore nobody
 * finishes. They share a role, which is nearly always right — everybody on the
 * team is a player except the two you fix afterwards.
 */
export function AddMembers({ groupType, alreadyIn, onAdd, onCancel }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [picked, setPicked] = useState([])
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)

  const roles = TYPE_ROLES[groupType] || []

  useEffect(() => {
    const t = setTimeout(async () => {
      const url = query.trim()
        ? `/api/people/search?q=${encodeURIComponent(query)}&limit=20`
        // Empty box lists everybody. In a family archive that is a hundred or
        // so people, and browsing is often faster than remembering how a
        // great-aunt spelled her name.
        : '/api/people/'
      const res = await fetch(url)
      setResults(res.ok ? await res.json() : [])
    }, query.trim() ? 200 : 0)
    return () => clearTimeout(t)
  }, [query])

  const toggle = person => setPicked(prev => (
    prev.some(p => p.id === person.id)
      ? prev.filter(p => p.id !== person.id)
      : [...prev, person]
  ))

  async function add() {
    if (!picked.length) return
    setSaving(true)
    try {
      await onAdd(picked, role)
      setPicked([])
      setRole('')
      setQuery('')
    } finally {
      setSaving(false)
    }
  }

  const offered = results.filter(p => !alreadyIn.has(p.id))

  return (
    <div style={{
      padding: 12, marginBottom: 14, borderRadius: 12,
      border: `1px solid ${C.border}`, background: C.bg,
    }}>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Who else was there?"
        style={field}
      />

      {offered.length > 0 && (
        <div style={{
          maxHeight: 210, overflowY: 'auto', marginTop: 8,
          border: `1px solid ${C.border}`, borderRadius: 9,
        }}>
          {offered.map(person => {
            const on = picked.some(p => p.id === person.id)
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => toggle(person)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '6px 9px', border: 0, font: 'inherit', fontSize: 12.5,
                  textAlign: 'left', cursor: 'pointer',
                  background: on ? C.activeBg : 'transparent',
                  color: on ? C.activeText : C.text,
                }}
              >
                <span style={{
                  display: 'grid', placeItems: 'center', width: 15, height: 15, flex: '0 0 auto',
                  borderRadius: 4, fontSize: 10, color: '#fff',
                  border: `1px solid ${on ? C.activeText : C.border}`,
                  background: on ? C.activeText : 'transparent',
                }}>
                  {on && '✓'}
                </span>
                <Avatar
                  name={displayName(person)}
                  src={person.avatar ? mediaUrl(person.avatar) : null}
                  size={20}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  {displayName(person)}
                  {otherName(person) && (
                    <span style={{ marginLeft: 5, color: C.muted }}>{otherName(person)}</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {picked.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {roles.length > 0 ? (
            <select value={role} onChange={e => setRole(e.target.value)} style={{ ...field, width: 'auto', flex: 1 }}>
              <option value="">What were they? (optional)</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          ) : (
            <input
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="What were they? (optional)"
              style={{ ...field, flex: 1 }}
            />
          )}
          <button
            type="button"
            onClick={add}
            disabled={saving}
            style={{
              height: 32, padding: '0 16px', borderRadius: 16, fontSize: 12.5,
              border: 0, background: C.activeText, color: '#fff', cursor: 'pointer',
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Adding…' : `Add ${picked.length}`}
          </button>
          <button type="button" onClick={onCancel} style={ghost}>Cancel</button>
        </div>
      )}

      {picked.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onCancel} style={ghost}>Cancel</button>
        </div>
      )}
    </div>
  )
}

const field = {
  width: '100%', boxSizing: 'border-box', height: 32, padding: '0 10px',
  border: `1px solid ${C.border}`, borderRadius: 8,
  font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
}
const ghost = {
  height: 32, padding: '0 14px', borderRadius: 16, fontSize: 12.5, font: 'inherit',
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}
