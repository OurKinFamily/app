import { useEffect, useState } from 'react'
import { TYPE_ROLES, describeGroup } from '../lib/circleTypes'
import { C } from './tokens'

/**
 * Putting somebody in a group.
 *
 * Search, or focus the empty box to see everything — with fourteen kinds of
 * group and not many of each, browsing is often faster than typing, and an
 * empty box that shows nothing until you guess a name hides what exists.
 *
 * The role list is offered from the group's type once one is chosen. A
 * free-text role becomes twelve spellings of "member" inside a year.
 */
export function AddToGroup({ personId, onAdded, onCancel }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [chosen, setChosen] = useState(null)
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      const url = query.trim()
        ? `/api/groups/?q=${encodeURIComponent(query)}`
        : '/api/groups/'
      const res = await fetch(url)
      setResults(res.ok ? await res.json() : [])
    }, query.trim() ? 200 : 0)
    return () => clearTimeout(t)
  }, [query])

  async function add() {
    if (!chosen) return
    setSaving(true)
    try {
      await fetch(`/api/groups/${chosen.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: personId, role: role || null }),
      })
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  const roles = chosen ? TYPE_ROLES[chosen.type] || [] : []

  return (
    <div style={panel}>
      {chosen ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: C.text }}>{chosen.name}</div>
            <div style={{ fontSize: 11.5, color: C.muted }}>{describeGroup(chosen)}</div>
          </div>
          <button type="button" onClick={() => { setChosen(null); setRole('') }} style={linkish}>
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find a group"
            style={field}
          />
          <div style={{ maxHeight: 190, overflowY: 'auto', marginTop: 6 }}>
            {results.map(g => (
              <button key={g.id} type="button" onClick={() => setChosen(g)} style={row}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13 }}>{g.name}</span>
                  <span style={{ display: 'block', fontSize: 11, color: C.muted }}>
                    {describeGroup(g)}
                  </span>
                </span>
              </button>
            ))}
            {results.length === 0 && (
              <p style={{ fontSize: 12.5, color: C.muted, padding: '8px 4px', margin: 0 }}>
                No groups match.
              </p>
            )}
          </div>
        </>
      )}

      {chosen && roles.length > 0 && (
        <select value={role} onChange={e => setRole(e.target.value)} style={{ ...field, marginTop: 8 }}>
          <option value="">Role (optional)</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <button type="button" onClick={onCancel} style={linkish}>Cancel</button>
        <button
          type="button"
          onClick={add}
          disabled={!chosen || saving}
          style={{
            height: 30, padding: '0 14px', borderRadius: 15, fontSize: 12.5,
            border: 0, background: C.activeText, color: '#fff',
            opacity: !chosen || saving ? 0.5 : 1,
            cursor: !chosen || saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  )
}

const panel = {
  border: `1px solid ${C.border}`, borderRadius: 10,
  padding: 12, marginBottom: 10, background: C.bg,
}
const field = {
  width: '100%', boxSizing: 'border-box', height: 32, padding: '0 10px',
  border: `1px solid ${C.border}`, borderRadius: 8,
  font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
}
const row = {
  display: 'flex', width: '100%', textAlign: 'left', alignItems: 'center',
  gap: 8, padding: '6px 4px', border: 0, background: 'transparent',
  cursor: 'pointer', borderRadius: 6, font: 'inherit', color: C.text,
}
const linkish = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 12.5, cursor: 'pointer',
}
