import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Trophy, Dumbbell, Palette, GraduationCap, School as SchoolIcon, Sparkles,
  Briefcase, Building2, Home, Church, Landmark, Users, Users2, Tent,
  ChevronLeft, ChevronDown, X, Search, LayoutGrid, List,
} from 'lucide-react'
import { Container } from '../components/new/Container'
import { Button } from '../components/new/Button'
import { Input } from '../components/new/Input'
import { Label } from '../components/new/Label'
import { Textarea } from '../components/new/Textarea'
import { EntityItem } from '../components/new/EntityItem'
import { Tag } from '../components/new/Tag'
import { Drawer } from '../components/new/Drawer'
import { mediaUrl } from '../lib/media'

const TYPE_META = {
  sports_team:      { label: 'Sports Team',      icon: Trophy,        tone: 'green'  },
  fitness:          { label: 'Fitness',          icon: Dumbbell,      tone: 'green'  },
  hobby_club:       { label: 'Hobby / Club',     icon: Palette,       tone: 'purple' },
  school_class:     { label: 'School Class',     icon: GraduationCap, tone: 'blue'   },
  school:           { label: 'School',           icon: SchoolIcon,    tone: 'blue'   },
  extracurricular:  { label: 'Extracurricular',  icon: Sparkles,      tone: 'cyan'   },
  workplace:        { label: 'Workplace',        icon: Briefcase,     tone: 'amber'  },
  professional_org: { label: 'Professional Org', icon: Building2,     tone: 'amber'  },
  neighborhood:     { label: 'Neighborhood',     icon: Home,          tone: 'orange' },
  religious:        { label: 'Religious',        icon: Church,        tone: 'pink'   },
  civic:            { label: 'Civic',            icon: Landmark,      tone: 'slate'  },
  family_friend:    { label: 'Family Friend',    icon: Users,         tone: 'pink'   },
  extended_network: { label: 'Extended Network', icon: Users2,        tone: 'cyan'   },
  camp:             { label: 'Camp',             icon: Tent,          tone: 'green'  },
}
const TYPE_KEYS = Object.keys(TYPE_META)

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

function typeIcon(type, size = 18) {
  const Icon = TYPE_META[type]?.icon || Users
  return <Icon size={size} />
}

const VIEW_STORAGE_KEY = 'group-members-view-mode'

export function GroupPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const [group, setGroup]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [filter, setFilter]   = useState('')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_STORAGE_KEY) || 'list')
  useEffect(() => { localStorage.setItem(VIEW_STORAGE_KEY, viewMode) }, [viewMode])

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

  if (loading) return <Container className="py-6"><p className="text-[13px] text-white/30">Loading…</p></Container>
  if (!group)  return <Container className="py-6"><p className="text-[13px] text-white/30">Group not found.</p></Container>

  const meta  = TYPE_META[group.type]
  const when  = [group.year, group.season].filter(Boolean).join(' ')
  const subline = [meta?.label || group.type, when, group.location_name].filter(Boolean).join(' · ')

  return (
    <Container className="py-6">
      <Link to="/manage/groups" className="flex items-center gap-1 text-[12px] text-white/40 hover:text-white/70">
        <ChevronLeft size={14} /> Groups
      </Link>

      <div className="mb-6 mt-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-zinc-400">{typeIcon(group.type, 24)}</span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-medium text-white/80">{group.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/45">
              {meta && <Tag tone={meta.tone}>{meta.label}</Tag>}
              {when && <span>{when}</span>}
              {group.location_name && <span>· {group.location_name}</span>}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          <Button
            size="sm"
            onClick={deleteGroup}
            className="border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
          >
            Delete
          </Button>
        </div>
      </div>

      {group.notes && <p className="mb-6 text-[13px] text-white/55">{group.notes}</p>}

      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
          Members · {group.members?.length ?? 0}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAddingMember(v => !v)}>
            {addingMember ? 'Cancel' : '+ Add member'}
          </Button>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {(group.members || []).length > 0 && (
        <div className="mb-5">
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <Input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter members…"
              className="pl-9"
            />
          </label>
        </div>
      )}

      {addingMember && (
        <AddMemberPanel
          groupId={id}
          groupType={group.type}
          existingIds={new Set((group.members || []).map(m => m.id))}
          onAdded={() => { setAddingMember(false); load() }}
        />
      )}

      {(() => {
        const all = group.members || []
        const q = filter.trim().toLowerCase()
        const visible = q
          ? all.filter(m => [m.name, m.known_as, m.role].filter(Boolean).join(' ').toLowerCase().includes(q))
          : all
        if (all.length === 0) return <p className="mt-3 text-[13px] text-white/25">No members yet.</p>
        if (visible.length === 0) return <p className="mt-3 text-[13px] text-white/25">No members match &ldquo;{filter}&rdquo;.</p>
        return (
          <div className={
            viewMode === 'grid'
              ? 'mt-3 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]'
              : 'mt-3 space-y-2'
          }>
            {visible.map(m => (
              <EntityItem
                key={m.id}
                avatar={m.avatar ? mediaUrl(m.avatar) : null}
                initials
                text={m.name}
                badge={m.role}
                onClick={() => navigate(`/manage/people/${m.id}`)}
                trailing={
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); removeMember(m.id) }}
                    aria-label="Remove member"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-white/25 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                }
                className="group"
              />
            ))}
          </div>
        )
      })()}

      <Drawer open={editing} onClose={() => setEditing(false)} title="Edit Group">
        <EditGroupForm
          group={group}
          onSaved={updated => { setGroup(g => ({ ...g, ...updated })); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      </Drawer>
    </Container>
  )
}

function ViewToggle({ value, onChange }) {
  const btn = (mode, Icon, label) => {
    const active = value === mode
    return (
      <button
        type="button"
        onClick={() => onChange(mode)}
        aria-label={label}
        aria-pressed={active}
        className={
          'flex h-8 w-8 items-center justify-center transition-colors ' +
          (active ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/70')
        }
      >
        <Icon size={16} />
      </button>
    )
  }
  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg border border-white/10">
      {btn('grid', LayoutGrid, 'Grid view')}
      {btn('list', List,       'List view')}
    </div>
  )
}

// ── Edit form (rendered inside Drawer) ────────────────────────────────────────

function EditGroupForm({ group, onSaved, onCancel }) {
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
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label required>Name</Label>
        <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <Label>Type</Label>
        <div className="relative">
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="w-full appearance-none rounded-lg border border-white/10 bg-[#1a1a1a] py-2 pl-3 pr-9 text-[13px] text-white outline-none focus:border-white/30"
          >
            {TYPE_KEYS.map(k => (
              <option key={k} value={k} className="bg-[#1a1a1a]">{TYPE_META[k].label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Year</Label>
          <Input type="number" placeholder="2025" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
        </div>
        <div>
          <Label>Season</Label>
          <Input placeholder="Fall, Spring…" value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label>Location</Label>
        <LocationPicker value={form.location} onChange={loc => setForm(f => ({ ...f, location: loc }))} />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  )
}

// ── Add member panel ──────────────────────────────────────────────────────────

function AddMemberPanel({ groupId, groupType, existingIds, onAdded }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [selected, setSelected] = useState([])
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
        }),
      ))
      setQuery(''); setSelected([]); setRole(''); setResults([])
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  const filtered = results.filter(p => !existingIds.has(p.id))

  return (
    <div className="mt-4 space-y-2 rounded-lg border border-white/8 bg-white/3 p-3">
      <p className="text-[11px] text-white/40">Add members</p>

      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={handleFocus}
        placeholder="Search people… (click to select multiple)"
      />

      {filtered.length > 0 && (
        <div className="max-h-48 overflow-y-auto overflow-hidden rounded border border-white/10 bg-[#1a1a1a]">
          {filtered.map(p => {
            const sel = !!selected.find(x => x.id === p.id)
            return (
              <button key={p.id} type="button" onClick={() => togglePerson(p)}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-white/5 ${sel ? 'bg-blue-500/10 text-white' : 'text-white/60'}`}>
                <div className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${sel ? 'border-blue-500 bg-blue-500' : 'border-white/20'}`}>
                  {sel && <span className="text-[8px] font-bold text-white">✓</span>}
                </div>
                {p.avatar
                  ? <img src={mediaUrl(p.avatar)} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
                  : <div className="h-5 w-5 shrink-0 rounded-full bg-white/10" />}
                <span>{p.name}{p.known_as ? <span className="ml-1 text-white/30">({p.known_as})</span> : ''}</span>
              </button>
            )
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(p => (
            <span key={p.id} className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[11px] text-blue-300">
              {p.name}
              <button type="button" onClick={() => togglePerson(p)} className="text-blue-300/50 hover:text-blue-300">×</button>
            </span>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex items-center gap-2">
          {roles.length > 0 ? (
            <div className="relative flex-1">
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full appearance-none rounded-lg border border-white/10 bg-[#1a1a1a] py-1.5 pl-2 pr-8 text-[12px] text-white outline-none"
              >
                <option value="" className="bg-[#1a1a1a]">Role (optional)</option>
                {roles.map(r => <option key={r} value={r} className="bg-[#1a1a1a]">{r}</option>)}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40" />
            </div>
          ) : (
            <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Role (optional)" className="flex-1" />
          )}
          <Button size="sm" disabled={saving} onClick={add}>
            {saving ? 'Adding…' : `Add ${selected.length}`}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Nominatim location picker ─────────────────────────────────────────────────

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
          { headers: { 'Accept-Language': 'en' } },
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
      <Input value={query} onChange={handleInput} placeholder="Search place…" />
      {value && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-green-400/70">
          <span>{value.lat.toFixed(4)}, {value.lng.toFixed(4)}</span>
          <button type="button" onClick={() => { onChange(null); setQuery('') }}
            className="ml-1 text-white/30 hover:text-white/60">×</button>
        </div>
      )}
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a] shadow-xl">
          {results.map(r => (
            <button key={r.place_id} type="button" onClick={() => pick(r)}
              className="block w-full truncate px-3 py-2 text-left text-[12px] text-white/70 transition-colors hover:bg-white/5">
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
