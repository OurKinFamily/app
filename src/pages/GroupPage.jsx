import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'

const TYPE_LABELS = {
  sports_team: 'Sports Team', fitness: 'Fitness', hobby_club: 'Hobby / Club',
  school_class: 'School Class', school: 'School', extracurricular: 'Extracurricular',
  workplace: 'Workplace', professional_org: 'Professional Org',
  neighborhood: 'Neighborhood', religious: 'Religious', civic: 'Civic',
  family_friend: 'Family Friend', extended_network: 'Extended Network',
  camp: 'Camp',
}

const TYPE_ROLES = {
  sports_team:      ['Player', 'Coach', 'Assistant Coach', 'Manager', 'Referee', 'Parent'],
  fitness:          ['Member', 'Instructor', 'Trainer'],
  hobby_club:       ['Member', 'Leader', 'Organizer'],
  school_class:     ['Student', 'Teacher', "Teacher's Aide", 'Classmate'],
  school:           ['Student', 'Teacher', 'Administrator', 'Staff', 'Parent'],
  extracurricular:  ['Member', 'Leader', 'Advisor', 'Coach'],
  workplace:        ['Colleague', 'Manager', 'Direct Report', 'Contractor'],
  professional_org: ['Member', 'Officer', 'Board Member'],
  neighborhood:     ['Neighbor', 'Organizer'],
  religious:        ['Member', 'Leader', 'Volunteer'],
  civic:            ['Member', 'Officer', 'Volunteer'],
  family_friend:    ['Friend', 'Family Friend', 'Parent'],
  extended_network: ['Acquaintance', 'Contact'],
  camp:             ['Camper', 'Counselor', 'Staff', 'Director'],
}

function LocationPicker({ value, onChange }) {
  const [query, setQuery]     = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)
  const timerRef              = useRef(null)

  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    if (value) onChange(null)
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
      } catch { /* ignore */ }
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
      <input value={query} onChange={handleInput}
        placeholder="Search place…"
        className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-white/25" />
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

function EditForm({ group, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name:     group.name,
    type:     group.type,
    year:     group.year || '',
    season:   group.season || '',
    notes:    group.notes || '',
    location: group.latitude ? { name: group.location_name, lat: group.latitude, lng: group.longitude } : null,
  })
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'PATCH',
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
      onSaved(await res.json())
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 p-4 bg-white/3 border border-white/8 rounded-xl space-y-3">
      <div>
        <label className="text-[11px] text-white/40 block mb-1">Name</label>
        <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
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
        <LocationPicker value={form.location} onChange={loc => setForm(f => ({...f, location: loc}))} />
      </div>
      <div>
        <label className="text-[11px] text-white/40 block mb-1">Notes</label>
        <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[13px] text-white outline-none focus:border-white/25 resize-none" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white text-[12px] rounded-lg transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-[12px] text-white/40 hover:text-white/70">Cancel</button>
      </div>
    </form>
  )
}

function AddMemberPanel({ groupId, groupType, existingIds, onAdded }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [selected, setSelected] = useState([])  // array of people
  const [role, setRole]         = useState('')
  const [saving, setSaving]     = useState(false)
  const roles = TYPE_ROLES[groupType] || []

  useEffect(() => {
    if (!query.trim()) return
    const t = setTimeout(async () => {
      const res = await fetch(`/api/people/search?q=${encodeURIComponent(query)}&limit=20`)
      setResults(await res.json())
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  async function handleFocus() {
    if (!query.trim()) {
      const res = await fetch('/api/people/')
      setResults(await res.json())
    }
  }

  function togglePerson(p) {
    setSelected(s => s.find(x => x.id === p.id) ? s.filter(x => x.id !== p.id) : [...s, p])
  }

  async function add() {
    if (!selected.length) return
    setSaving(true)
    try {
      await Promise.all(selected.map(p =>
        fetch(`/api/groups/${groupId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ person_id: p.id, role: role || null }),
        })
      ))
      setQuery(''); setSelected([]); setRole(''); setResults([])
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  const filtered = results.filter(p => !existingIds.has(p.id))

  return (
    <div className="mt-4 p-3 bg-white/3 border border-white/8 rounded-lg space-y-2">
      <p className="text-[11px] text-white/40">Add members</p>

      {/* Search input */}
      <input value={query} onChange={e => setQuery(e.target.value)}
        onFocus={handleFocus}
        placeholder="Search people… (click to select multiple)"
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white placeholder-white/25 outline-none focus:border-white/25" />

      {/* Results list */}
      {filtered.length > 0 && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map(p => {
            const isSelected = !!selected.find(x => x.id === p.id)
            return (
              <button key={p.id} onClick={() => togglePerson(p)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-[12px] hover:bg-white/5 text-left transition-colors ${isSelected ? 'bg-blue-500/10 text-white' : 'text-white/60'}`}>
                <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/20'}`}>
                  {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
                </div>
                {p.avatar
                  ? <img src={`/api/media/${p.avatar}`} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                  : <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />}
                <span>{p.name}{p.known_as ? <span className="text-white/30 ml-1">({p.known_as})</span> : ''}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(p => (
            <span key={p.id} className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 rounded-full text-[11px] text-blue-300">
              {p.name}
              <button onClick={() => togglePerson(p)} className="text-blue-300/50 hover:text-blue-300">✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Role + submit */}
      {selected.length > 0 && (
        <div className="flex gap-2 items-center">
          {roles.length > 0 ? (
            <select value={role} onChange={e => setRole(e.target.value)}
              className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-[12px] text-white outline-none">
              <option value="" className="bg-[#1a1a1a]">Role (optional)</option>
              {roles.map(r => <option key={r} value={r} className="bg-[#1a1a1a]">{r}</option>)}
            </select>
          ) : (
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role (optional)"
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white placeholder-white/25 outline-none" />
          )}
          <button onClick={add} disabled={saving}
            className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white/80 text-[12px] rounded transition-colors disabled:opacity-50 shrink-0">
            {saving ? 'Adding…' : `Add ${selected.length}`}
          </button>
        </div>
      )}
    </div>
  )
}

export function GroupPage() {
  const { id }                          = useParams()
  const navigate                        = useNavigate()
  const [group, setGroup]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [editing, setEditing]           = useState(false)
  const [addingMember, setAddingMember] = useState(false)

  async function load() {
    const res = await fetch(`/api/groups/${id}`)
    if (res.ok) setGroup(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function removeMember(personId) {
    await fetch(`/api/groups/${id}/members/${personId}`, { method: 'DELETE' })
    load()
  }

  async function deleteGroup() {
    if (!confirm(`Delete "${group.name}"? This cannot be undone.`)) return
    await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    navigate('/manage/groups')
  }

  if (loading) return <div className="p-6 text-white/30 text-sm">Loading…</div>
  if (!group)  return <div className="p-6 text-white/30 text-sm">Group not found.</div>

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-1">
        <Link to="/manage/groups" className="text-[11px] text-white/30 hover:text-white/60">← Groups</Link>
      </div>

      {editing ? (
        <EditForm
          group={group}
          onSaved={updated => { setGroup(g => ({...g, ...updated})); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-medium text-white/90">{group.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-white/40">{TYPE_LABELS[group.type] || group.type}</span>
              {group.year && <span className="text-[11px] text-white/30">· {group.year}{group.season ? ` ${group.season}` : ''}</span>}
              {group.location_name && <span className="text-[11px] text-white/30">· {group.location_name}</span>}
            </div>
            {group.notes && <p className="mt-2 text-[12px] text-white/40">{group.notes}</p>}
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={() => setEditing(true)}
              className="text-[11px] text-white/30 hover:text-white/60 transition-colors px-2 py-1">
              Edit
            </button>
            <button onClick={deleteGroup}
              className="text-[11px] text-white/20 hover:text-red-400 transition-colors px-2 py-1">
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[12px] font-medium text-white/50 uppercase tracking-wider">
          Members · {group.members?.length ?? 0}
        </h2>
        <button onClick={() => setAddingMember(v => !v)}
          className="text-[11px] text-white/40 hover:text-white/70 px-2 py-1 rounded transition-colors">
          {addingMember ? 'Cancel' : '+ Add member'}
        </button>
      </div>

      {addingMember && (
        <AddMemberPanel
          groupId={id}
          groupType={group.type}
          existingIds={new Set((group.members || []).map(m => m.id))}
          onAdded={() => { setAddingMember(false); load() }}
        />
      )}

      <div className="space-y-1 mt-3">
        {(group.members || []).length === 0 ? (
          <p className="text-[12px] text-white/25">No members yet.</p>
        ) : (group.members || []).map(m => (
          <div key={m.id} className="flex items-center gap-3 p-2.5 bg-white/3 border border-white/6 rounded-lg group">
            {m.avatar
              ? <img src={`/api/media/${m.avatar}`} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              : <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />}
            <div className="flex-1 min-w-0">
              <Link to={`/manage/people/${m.id}`} className="text-[13px] text-white/70 hover:text-white">{m.name}</Link>
              {m.role && <span className="text-[11px] text-white/30 ml-2">{m.role}</span>}
            </div>
            <button onClick={() => removeMember(m.id)}
              className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 text-xs px-2 transition-all">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
