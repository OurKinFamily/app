import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Trophy, Dumbbell, Palette, GraduationCap, School as SchoolIcon, Sparkles,
  Briefcase, Building2, Home, Church, Landmark, Users, Users2, Tent, Search,
  LayoutGrid, List, ChevronDown,
} from 'lucide-react'
import { Button } from '../components/Button'
import { Container } from '../components/Container'
import { Input } from '../components/Input'
import { Label } from '../components/Label'
import { Textarea } from '../components/Textarea'
import { EntityItem } from '../components/EntityItem'
import { Tag } from '../components/Tag'
import { Drawer } from '../components/Drawer'

const VIEW_STORAGE_KEY = 'groups-view-mode'

const TYPE_META = {
  sports_team:      { label: 'Sports Team',      icon: Trophy,       tone: 'green'  },
  fitness:          { label: 'Fitness',          icon: Dumbbell,     tone: 'green'  },
  hobby_club:       { label: 'Hobby / Club',     icon: Palette,      tone: 'purple' },
  school_class:     { label: 'School Class',     icon: GraduationCap, tone: 'blue'   },
  school:           { label: 'School',           icon: SchoolIcon,   tone: 'blue'   },
  extracurricular:  { label: 'Extracurricular',  icon: Sparkles,     tone: 'cyan'   },
  workplace:        { label: 'Workplace',        icon: Briefcase,    tone: 'amber'  },
  professional_org: { label: 'Professional Org', icon: Building2,    tone: 'amber'  },
  neighborhood:     { label: 'Neighborhood',     icon: Home,         tone: 'orange' },
  religious:        { label: 'Religious',        icon: Church,       tone: 'pink'   },
  civic:            { label: 'Civic',            icon: Landmark,     tone: 'slate'  },
  family_friend:    { label: 'Family Friend',    icon: Users,        tone: 'pink'   },
  extended_network: { label: 'Extended Network', icon: Users2,       tone: 'cyan'   },
  camp:             { label: 'Camp',             icon: Tent,         tone: 'green'  },
}
const TYPE_KEYS = Object.keys(TYPE_META)

function typeIcon(type, size = 18) {
  const Icon = TYPE_META[type]?.icon || Users
  return <Icon size={size} />
}

export function GroupsPage() {
  const navigate = useNavigate()
  const [groups, setGroups]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [creating, setCreating]   = useState(false)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_STORAGE_KEY) || 'list')
  useEffect(() => { localStorage.setItem(VIEW_STORAGE_KEY, viewMode) }, [viewMode])

  async function load() {
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (filter)     params.set('q',    filter)
    const res  = await fetch(`/api/groups/?${params}`)
    const data = await res.json()
    setGroups(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter, typeFilter])

  function handleCreated() { setCreating(false); load() }

  return (
    <Container className="py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium text-white/80">Groups</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>+ New Group</Button>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <label className="relative md:flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search groups…"
            className="pl-9"
          />
        </label>
        <div className="relative w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="w-full appearance-none rounded-lg border border-white/10 bg-[#1a1a1a] py-2 pl-3 pr-9 text-[13px] text-white outline-none focus:border-white/30 md:w-auto"
          >
            <option value="" className="bg-[#1a1a1a]">All types</option>
            {TYPE_KEYS.map(k => (
              <option key={k} value={k} className="bg-[#1a1a1a]">{TYPE_META[k].label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
        </div>
      </div>

      {loading ? (
        <p className="text-[13px] text-white/30">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-[13px] text-white/25">No groups yet.</p>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]'
            : 'space-y-2'
        }>
          {groups.map(g => {
            const meta = TYPE_META[g.type]
            const when = [g.year, g.season].filter(Boolean).join(' · ')
            return (
              <EntityItem
                key={g.id}
                icon={typeIcon(g.type)}
                text={
                  <span className="flex items-center gap-2">
                    <span>{g.name}</span>
                    {when && <span className="text-[11px] text-white/30">{when}</span>}
                  </span>
                }
                secondary={g.location_name}
                trailing={
                  <span className="flex flex-col items-end gap-1">
                    <Tag tone={meta?.tone || 'default'}>{meta?.label || g.type}</Tag>
                    <span className="text-[11px] text-white/30">
                      {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                    </span>
                  </span>
                }
                onClick={() => navigate(`/manage/groups/${g.id}`)}
              />
            )
          })}
        </div>
      )}

      <Drawer open={creating} onClose={() => setCreating(false)} title="New Group">
        <CreateGroupForm onCreated={handleCreated} onCancel={() => setCreating(false)} />
      </Drawer>
    </Container>
  )
}

// Grid / list toggle (shared shape with PersonScrapbook's ViewToggle).
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

// ── Create form (rendered inside the Drawer) ──────────────────────────────────

function CreateGroupForm({ onCreated, onCancel }) {
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
      onCreated(group)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label required>Name</Label>
        <Input required autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <Label>Type</Label>
        <select
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-[13px] text-white outline-none focus:border-white/30"
        >
          {TYPE_KEYS.map(k => (
            <option key={k} value={k} className="bg-[#1a1a1a]">{TYPE_META[k].label}</option>
          ))}
        </select>
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
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
      </div>
    </form>
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
