import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const TYPE_LABELS = {
  sports_team: 'Sports Team', fitness: 'Fitness', hobby_club: 'Hobby / Club',
  school_class: 'School Class', school: 'School', extracurricular: 'Extracurricular',
  workplace: 'Workplace', professional_org: 'Professional Org',
  neighborhood: 'Neighborhood', religious: 'Religious', civic: 'Civic',
  family_friend: 'Family Friend', extended_network: 'Extended Network',
  camp: 'Camp',
}

const TYPE_COLORS = {
  sports_team: 'bg-green-900/40 text-green-300',
  fitness: 'bg-emerald-900/40 text-emerald-300',
  hobby_club: 'bg-purple-900/40 text-purple-300',
  school_class: 'bg-blue-900/40 text-blue-300',
  school: 'bg-blue-900/40 text-blue-300',
  extracurricular: 'bg-indigo-900/40 text-indigo-300',
  workplace: 'bg-orange-900/40 text-orange-300',
  professional_org: 'bg-amber-900/40 text-amber-300',
  neighborhood: 'bg-yellow-900/40 text-yellow-300',
  religious: 'bg-rose-900/40 text-rose-300',
  civic: 'bg-slate-700/40 text-slate-300',
  family_friend: 'bg-pink-900/40 text-pink-300',
  extended_network: 'bg-fuchsia-900/40 text-fuchsia-300',
  camp: 'bg-teal-900/40 text-teal-300',
}

function LocationPicker({ value, onChange }) {
  const [query, setQuery]       = useState(value?.name || '')
  const [results, setResults]   = useState([])
  const [open, setOpen]         = useState(false)
  const timerRef                = useRef(null)

  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    if (value) onChange(null)           // clear selection when typing again
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        setResults(data)
        setOpen(data.length > 0)
      } catch { /* network error, silently ignore */ }
    }, 350)
  }

  function pick(r) {
    const name = r.display_name.split(',').slice(0, 2).join(',').trim()
    setQuery(name)
    setResults([])
    setOpen(false)
    onChange({ name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) })
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={handleInput}
        placeholder="Search place…"
        className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-white/25"
      />
      {value && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-green-400/70">
          <span>📍</span>
          <span>{value.lat.toFixed(4)}, {value.lng.toFixed(4)}</span>
          <button type="button" onClick={() => { onChange(null); setQuery('') }}
            className="ml-1 text-white/30 hover:text-white/60">✕</button>
        </div>
      )}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded shadow-xl overflow-hidden">
          {results.map(r => (
            <button key={r.place_id} type="button" onClick={() => pick(r)}
              className="w-full text-left px-3 py-2 text-[12px] text-white/70 hover:bg-white/5 truncate">
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateGroupModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', type: 'sports_team', year: '', season: '', location: null, notes: '' })
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/groups/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          form.name,
          type:          form.type,
          year:          form.year ? parseInt(form.year) : null,
          season:        form.season || null,
          notes:         form.notes || null,
          location_name: form.location?.name || null,
          latitude:      form.location?.lat  || null,
          longitude:     form.location?.lng  || null,
        }),
      })
      const group = await res.json()
      onCreate(group)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#111] border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h2 className="text-sm font-medium text-white/80 mb-4">New Group</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-[11px] text-white/40 block mb-1">Name</label>
            <input required autoFocus value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[13px] text-white outline-none focus:border-white/25" />
          </div>
          <div>
            <label className="text-[11px] text-white/40 block mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-1.5 text-[13px] text-white outline-none focus:border-white/25">
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k} className="bg-[#1a1a1a]">{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/40 block mb-1">Year</label>
              <input type="number" placeholder="2025" value={form.year} onChange={e => setForm(f => ({...f, year: e.target.value}))}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[13px] text-white outline-none focus:border-white/25" />
            </div>
            <div>
              <label className="text-[11px] text-white/40 block mb-1">Season</label>
              <input placeholder="Fall, Spring…" value={form.season} onChange={e => setForm(f => ({...f, season: e.target.value}))}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[13px] text-white outline-none focus:border-white/25" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-white/40 block mb-1">Location</label>
            <LocationPicker
              value={form.location}
              onChange={loc => setForm(f => ({ ...f, location: loc }))}
            />
          </div>
          <div>
            <label className="text-[11px] text-white/40 block mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[13px] text-white outline-none focus:border-white/25 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-[12px] text-white/40 hover:text-white/70">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white text-[12px] rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function GroupsPage() {
  const [groups, setGroups]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [creating, setCreating]   = useState(false)

  async function load() {
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (filter) params.set('q', filter)
    const res = await fetch(`/api/groups/?${params}`)
    const data = await res.json()
    setGroups(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter, typeFilter])

  function handleCreated(group) {
    setCreating(false)
    load()
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-white/80">Groups</h1>
        <button onClick={() => setCreating(true)}
          className="px-3 py-1.5 bg-white/8 hover:bg-white/12 border border-white/10 text-white/70 text-[12px] rounded-lg transition-colors">
          + New Group
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search groups…"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-white/25"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-[13px] text-white outline-none focus:border-white/25">
          <option value="" className="bg-[#1a1a1a]">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k} className="bg-[#1a1a1a]">{v}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-white/30 text-sm">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-white/30 text-sm">No groups yet.</p>
      ) : (
        <div className="space-y-2">
          {groups.map(g => (
            <Link key={g.id} to={`/manage/groups/${g.id}`}
              className="flex items-center gap-3 p-3 bg-white/3 hover:bg-white/6 border border-white/6 rounded-lg transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] text-white/80 group-hover:text-white truncate">{g.name}</span>
                  {g.year && <span className="text-[11px] text-white/30">{g.year}{g.season ? ` · ${g.season}` : ''}</span>}
                </div>
                {g.location_name && <p className="text-[11px] text-white/30 truncate">{g.location_name}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_COLORS[g.type] || 'bg-white/10 text-white/40'}`}>
                  {TYPE_LABELS[g.type] || g.type}
                </span>
                <span className="text-[11px] text-white/25">{g.member_count} member{g.member_count !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && <CreateGroupModal onClose={() => setCreating(false)} onCreate={handleCreated} />}
    </div>
  )
}
