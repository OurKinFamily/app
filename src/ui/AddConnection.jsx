import { useEffect, useState } from 'react'
import { Avatar } from './Avatar'
import { displayName } from '../lib/people'
import { mediaUrl } from '../lib/media'
import { C } from './tokens'

/**
 * Recording that two people knew each other.
 *
 * Several at once, because connections come in groups: you remember the four
 * people from that job, not one of them. Each gets the same context and date,
 * which is nearly always right — they are being added together because they
 * belong together.
 *
 * The context is free text on purpose. "Worked together at Raytheon" and "Best
 * man at the wedding" are the point; a dropdown of relationship types would
 * lose exactly the part worth keeping.
 */
export function AddConnection({ personId, existingIds, onAdded, onCancel }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [chosen, setChosen] = useState([])
  const [context, setContext] = useState('')
  const [since, setSince] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      const url = query.trim()
        ? `/api/people/search?q=${encodeURIComponent(query)}`
        : '/api/people/'
      const res = await fetch(url)
      const rows = res.ok ? await res.json() : []
      setResults(Array.isArray(rows) ? rows.slice(0, 40) : [])
    }, query.trim() ? 200 : 0)
    return () => clearTimeout(t)
  }, [query])

  const toggle = p => setChosen(c =>
    c.some(x => x.id === p.id) ? c.filter(x => x.id !== p.id) : [...c, p])

  async function save() {
    if (!chosen.length) return
    setSaving(true)
    try {
      await Promise.all(chosen.map(p =>
        fetch(`/api/people/${personId}/connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_id: p.id,
            context: context || null,
            since: since || null,
          }),
        })))
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  // Never offer somebody already connected, or the person themselves.
  const offered = results.filter(p => p.id !== personId && !existingIds?.has(p.id))

  return (
    <div style={panel}>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Find people"
        style={field}
      />

      {chosen.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {chosen.map(p => (
            <button key={p.id} type="button" onClick={() => toggle(p)} style={chip}>
              {displayName(p)} ✕
            </button>
          ))}
        </div>
      )}

      <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 8 }}>
        {offered.map(p => (
          <button key={p.id} type="button" onClick={() => toggle(p)} style={row}>
            <Avatar name={displayName(p)} src={p.avatar ? mediaUrl(p.avatar) : null} size={24} />
            <span style={{ fontSize: 13 }}>{displayName(p)}</span>
          </button>
        ))}
        {offered.length === 0 && (
          <p style={{ fontSize: 12.5, color: C.muted, padding: '8px 4px', margin: 0 }}>
            Nobody left to add.
          </p>
        )}
      </div>

      <input
        value={context}
        onChange={e => setContext(e.target.value)}
        placeholder="How did they know each other?"
        style={{ ...field, marginTop: 8 }}
      />
      <input
        value={since}
        onChange={e => setSince(e.target.value)}
        placeholder="Since (optional, e.g. 1978)"
        style={{ ...field, marginTop: 6 }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <button type="button" onClick={onCancel} style={linkish}>Cancel</button>
        <button
          type="button"
          onClick={save}
          disabled={!chosen.length || saving}
          style={{
            height: 30, padding: '0 14px', borderRadius: 15, fontSize: 12.5,
            border: 0, background: C.activeText, color: '#fff',
            opacity: !chosen.length || saving ? 0.5 : 1,
            cursor: !chosen.length || saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Adding…' : `Add ${chosen.length || ''}`.trim()}
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
  gap: 8, padding: '5px 4px', border: 0, background: 'transparent',
  cursor: 'pointer', borderRadius: 6, font: 'inherit', color: C.text,
}
const chip = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '3px 9px', borderRadius: 999, border: 0,
  background: C.activeBg, color: C.activeText, fontSize: 12, cursor: 'pointer',
}
const linkish = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 12.5, cursor: 'pointer',
}
