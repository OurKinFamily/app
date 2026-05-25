import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { searchPeople, getPeople } from '../lib/api'

const CONNECTION_TYPES = [
  'Friend', 'Close Friend', 'Childhood Friend',
  'Coworker', 'Colleague', 'Business Partner',
  'Neighbor', 'Acquaintance',
  'Family Friend', 'Classmate', 'Teammate',
  'Mentor', 'Mentee', 'Other',
]

export function PersonConnections() {
  const { person } = useOutletContext()
  const [connections, setConnections] = useState([])
  const [loading, setLoading]         = useState(true)
  const [adding, setAdding]           = useState(false)

  async function load() {
    const res = await fetch(`/api/people/${person.id}/connections`)
    if (res.ok) setConnections(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [person.id])

  async function remove(otherId) {
    await fetch(`/api/people/${person.id}/connections/${otherId}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[12px] font-medium text-white/50 uppercase tracking-wider">
          Connections · {connections.length}
        </h2>
        <button onClick={() => setAdding(v => !v)}
          className="text-[11px] text-white/40 hover:text-white/70 px-2 py-1 rounded transition-colors">
          {adding ? 'Cancel' : '+ Add connection'}
        </button>
      </div>

      {adding && (
        <AddConnectionPanel
          personId={person.id}
          existingIds={new Set(connections.map(c => c.id))}
          onAdded={() => { setAdding(false); load() }}
        />
      )}

      {loading ? (
        <p className="text-white/30 text-sm">Loading…</p>
      ) : connections.length === 0 ? (
        <p className="text-[12px] text-white/25">No connections yet.</p>
      ) : (
        <div className="space-y-1 mt-3">
          {connections.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-2.5 bg-white/3 border border-white/6 rounded-lg group">
              {c.avatar
                ? <img src={`/api/media/${c.avatar}`} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                : <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-white/30 text-xs font-medium">
                    {(c.known_as || c.name).slice(0, 1).toUpperCase()}
                  </div>}
              <div className="flex-1 min-w-0">
                <Link to={`/manage/people/${c.id}`} className="text-[13px] text-white/70 hover:text-white">
                  {c.name}
                </Link>
                <div className="flex items-center gap-2 flex-wrap">
                  {c.context && <span className="text-[11px] text-white/30">{c.context}</span>}
                  {c.through_groups?.map(g => (
                    <Link key={g.id} to={`/manage/groups/${g.id}`}
                      className="text-[11px] text-white/20 hover:text-white/50">
                      via {g.name}
                    </Link>
                  ))}
                </div>
              </div>
              {c.since && <span className="text-[11px] text-white/25 shrink-0">{c.since}</span>}
              <button onClick={() => remove(c.id)}
                className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 text-xs px-2 transition-all">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GroupSearch({ value, onChange }) {
  const [query, setQuery]   = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [open, setOpen]     = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/groups/?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data)
      setOpen(data.length > 0)
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  async function handleFocus() {
    if (!query.trim()) {
      const res = await fetch('/api/groups/')
      const data = await res.json()
      setResults(data)
      setOpen(data.length > 0)
    }
  }

  function pick(g) {
    setQuery(g.name)
    setOpen(false)
    onChange({ id: g.id, name: g.name })
  }

  return (
    <div className="relative">
      <input value={query}
        onChange={e => { setQuery(e.target.value); if (value) onChange(null) }}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Met through group? (optional)"
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white placeholder-white/25 outline-none focus:border-white/25" />
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded overflow-hidden shadow-xl max-h-40 overflow-y-auto">
          {results.map(g => (
            <button key={g.id} type="button" onClick={() => pick(g)}
              className="w-full text-left px-2 py-1.5 text-[12px] text-white/60 hover:bg-white/5 truncate">
              {g.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AddConnectionPanel({ personId, existingIds, onAdded }) {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [selected, setSelected]   = useState([])
  const [context, setContext]     = useState('')
  const [since, setSince]         = useState('')
  const [throughGroup, setThroughGroup] = useState(null)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (!query.trim()) return
    const t = setTimeout(async () => {
      setResults(await searchPeople(query).catch(() => []))
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  async function handleFocus() {
    if (!query.trim()) setResults(await getPeople().catch(() => []))
  }

  function toggle(p) {
    setSelected(s => s.find(x => x.id === p.id) ? s.filter(x => x.id !== p.id) : [...s, p])
  }

  async function save() {
    if (!selected.length) return
    setSaving(true)
    try {
      await Promise.all(selected.map(p =>
        fetch(`/api/people/${personId}/connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_id:        p.id,
            context:          context          || null,
            since:            since            || null,
            through_group_id: throughGroup?.id || null,
          }),
        })
      ))
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  const filtered = results.filter(p => p.id !== personId)

  return (
    <div className="mb-4 p-3 bg-white/3 border border-white/8 rounded-lg space-y-2">
      <>
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Search people… (select multiple)"
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white placeholder-white/25 outline-none focus:border-white/25" />

        {filtered.length > 0 && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded overflow-hidden max-h-48 overflow-y-auto">
            {filtered.map(p => {
              const isSel = !!selected.find(x => x.id === p.id)
              return (
                <button key={p.id} onClick={() => toggle(p)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-[12px] hover:bg-white/5 text-left transition-colors ${isSel ? 'bg-blue-500/10 text-white' : 'text-white/60'}`}>
                  <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${isSel ? 'bg-blue-500 border-blue-500' : 'border-white/20'}`}>
                    {isSel && <span className="text-white text-[8px] font-bold">✓</span>}
                  </div>
                  {p.avatar
                    ? <img src={`/api/media/${p.avatar}`} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                    : <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />}
                  <span>{p.name}{p.known_as ? <span className="text-white/30 ml-1">({p.known_as})</span> : ''}</span>
                  {existingIds.has(p.id) && <span className="ml-auto text-[10px] text-white/20">+ group</span>}
                </button>
              )
            })}
          </div>
        )}

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selected.map(p => (
              <span key={p.id} className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 rounded-full text-[11px] text-blue-300">
                {p.name}
                <button onClick={() => toggle(p)} className="text-blue-300/50 hover:text-blue-300">✕</button>
              </span>
            ))}
          </div>
        )}

        {selected.length > 0 && (
          <>
            <select value={context} onChange={e => setContext(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-[12px] text-white outline-none focus:border-white/25">
              <option value="" className="bg-[#1a1a1a]">Relationship (optional)</option>
              {CONNECTION_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
            </select>
            <GroupSearch value={throughGroup} onChange={setThroughGroup} />
            <div className="flex gap-2 items-center">
              <input value={since} onChange={e => setSince(e.target.value)}
                placeholder="Since (e.g. 2022)"
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white placeholder-white/25 outline-none focus:border-white/25" />
              <button onClick={save} disabled={saving}
                className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white/80 text-[12px] rounded transition-colors disabled:opacity-50 shrink-0">
                {saving ? 'Saving…' : `Add ${selected.length}`}
              </button>
            </div>
          </>
        )}
      </>
    </div>
  )
}
