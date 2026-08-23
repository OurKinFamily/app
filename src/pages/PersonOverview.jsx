import { useState, useEffect, useRef } from 'react'
import { useOutletContext, useNavigate, Link } from 'react-router-dom'
import { searchPeople, getPeople, setCover } from '../lib/api'
import { mediaUrl } from '../lib/media'
import { displayName } from '../lib/people'
import { useGallery } from '../lib/useGallery'
import { useFavorites } from '../lib/useFavorites'
import { EntityChip } from '../components/EntityChip'
import { EntityItem } from '../components/EntityItem'
import { MediaGallery } from '../components/MediaGallery'
import { PhotoLightbox } from '../components/PhotoLightbox'
import { PersonLifeStages } from '../components/PersonLifeStages'
import { useMe } from '../contexts/MeContext'

// ── Constants ────────────────────────────────────────────────────────────────

export const TYPE_LABELS = {
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

const CONNECTION_TYPES = [
  'Friend', 'Close Friend', 'Childhood Friend',
  'Coworker', 'Colleague', 'Business Partner',
  'Neighbor', 'Acquaintance',
  'Family Friend', 'Classmate', 'Teammate',
  'Mentor', 'Mentee', 'Other',
]

const INPUT_CLS = "w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-white/25"

// ── Main ─────────────────────────────────────────────────────────────────────

export function PersonOverview() {
  const { person, setPerson, editing, setEditing } = useOutletContext()

  return (
    <>
      {/* Personal info */}
      <div className="max-w-xl space-y-8 mb-8">
        {editing ? (
          <EditForm person={person} onSaved={updated => { setPerson(updated); setEditing(false) }} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <RelationshipLine personId={person.id} />
            {person.maiden_name && <p className="text-white/40 text-sm">Née {person.maiden_name}</p>}
            {person.former_names?.length > 0 && (
              <p className="text-white/35 text-xs">
                Also known as: {person.former_names.join(' · ')}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {person.death_date          && <Field label="Passed"               value={formatDate(person.death_date, person.death_date_precision)} />}
              {person.death_place         && <Field label="Last home"            value={person.death_place} />}
              {person.burial_place        && <Field label="Laid to rest"         value={person.burial_place} />}
              {person.immigration_date    && <Field label="Arrived"              value={formatDate(person.immigration_date, 'year')} />}
              {person.immigration_place   && <Field label="From / via"           value={person.immigration_place} />}
              {person.naturalization_date && <Field label="Became citizen"       value={formatDate(person.naturalization_date, 'year')} />}
              {person.naturalization_place&& <Field label="Took citizenship in"  value={person.naturalization_place} />}
              {person.ssn                 && <Field label="SSN"                  value={person.ssn} />}
            </div>

            {person.notes && <p className="text-white/50 text-sm">{person.notes}</p>}
          </>
        )}
      </div>

      <PersonLifeStages personId={person.id} />



      <PersonGalleryInline personId={person.id} />
    </>
  )
}

// ── Inline gallery ────────────────────────────────────────────────────────────

// Shows a one-line derived relationship like "Your great-grandfather, on your
// mother's side", based on the graph walk from the logged-in viewer to this
// person. Stays silent when no path can be computed.
function RelationshipLine({ personId }) {
  const { viewerPersonId } = useMe()
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!personId) return
    let alive = true
    const url = viewerPersonId
      ? `/api/people/${personId}/relationship?viewer_id=${viewerPersonId}`
      : `/api/people/${personId}/relationship`
    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive) setData(d) })
      .catch(() => { if (alive) setData(null) })
    return () => { alive = false }
  }, [personId, viewerPersonId])
  if (!data?.label) return null
  return (
    <p className="text-sm capitalize text-white/65">
      {data.label}{data.side ? `, on ${data.side}` : ''}
    </p>
  )
}

function PersonGalleryInline({ personId }) {
  const { person, setPerson } = useOutletContext()
  // min_confidence:'all' (not a CONFIDENCE_SET key) bypasses the date-confidence
  // filter — a person's gallery should show every photo they're in regardless of
  // how sure we are of the date. The default 'high' hid medium/low-dated photos
  // (e.g. freshly-assigned singleton straggler faces).
  const { media, total, loading, hasMoreOlder, loadOlder, fillGap } = useGallery({
    params: { person_ids: personId, min_confidence: 'all' },
  })
  const { favs, toggle: toggleFav } = useFavorites()
  const [viewer, setViewer] = useState(null)

  // Auto-fill if the first batch didn't fill the viewport — MediaGallery's
  // scroll listener can't fire when the page isn't scrollable yet.
  useEffect(() => {
    if (loading || !hasMoreOlder || media.length === 0) return
    const doc = document.documentElement
    if (doc.scrollHeight < window.innerHeight * 1.5) loadOlder()
  }, [media.length, loading, hasMoreOlder, loadOlder])

  if (media.length === 0 && !loading) return null

  return (
    <div className="mt-10">
      <p className="mb-3 flex items-baseline justify-end gap-2 text-xs uppercase tracking-wider text-white/40">
        <span>Gallery · {(total ?? media.length).toLocaleString()}</span>
        <Link
          to={`/manage/faces/similar?person_id=${personId}`}
          title="Find similar faces across the archive"
          className="text-[11px] normal-case tracking-normal text-blue-400/70 transition-colors hover:text-blue-300"
        >
          Find more →
        </Link>
      </p>
      <MediaGallery
        items={media}
        favorites={favs}
        onFavorite={it => toggleFav(it.path)}
        onSelect={it => setViewer(media.findIndex(m => m.path === it.path))}
        onLoadOlder={loadOlder}
        onFillGap={fillGap}
      />
      {(loading || hasMoreOlder) && (
        <div className="flex h-8 items-center justify-center text-[11px] text-white/20">
          {loading ? 'Loading…' : ''}
        </div>
      )}

      {viewer !== null && viewer >= 0 && (
        <PhotoLightbox
          items={media}
          initialIndex={viewer}
          onClose={() => setViewer(null)}
          onNeedMore={() => { if (!loading && hasMoreOlder) loadOlder() }}
          currentCoverPath={person.cover_image}
          onSetCover={async it => {
            const path = it.path
            await setCover(person.id, path, person.cover_position || 'center')
            setPerson(p => ({ ...p, cover_image: path }))
          }}
        />
      )}
    </div>
  )
}

// ── Inline suggestion chip ────────────────────────────────────────────────────

export function InlineSuggestion({ suggestion: s, otherPerson, onYes, onNo }) {
  const [busy, setBusy]       = useState(false)
  const [showCtx, setShowCtx] = useState(false)
  const [context, setContext] = useState('')
  const target = otherPerson || s.target

  async function yes() {
    if (s.type === 'connection' && !showCtx) { setShowCtx(true); return }
    setBusy(true); try { await onYes(context || null) } finally { setBusy(false) }
  }
  async function no() { setBusy(true); try { await onNo() } finally { setBusy(false) } }

  return (
    <div className="px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-amber-400/70">?</span>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {target?.avatar
            ? <img src={mediaUrl(target.avatar)} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            : target && <div className="w-5 h-5 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[9px] text-white/40">
                {(target.known_as || target.name || '').slice(0, 1).toUpperCase()}
              </div>}
          {target && <span className="text-[12px] text-white/70 shrink-0">{target.known_as || target.name}</span>}
          <span className="text-[11px] text-white/35 truncate">· {s.reason}</span>
        </div>
        <button onClick={yes} disabled={busy}
          className="px-2 py-0.5 text-[11px] text-emerald-400 hover:bg-emerald-500/15 rounded transition-colors disabled:opacity-40">
          Yes
        </button>
        <button onClick={no} disabled={busy}
          className="px-2 py-0.5 text-[11px] text-white/25 hover:text-white/50 rounded transition-colors disabled:opacity-40">
          No
        </button>
      </div>
      {showCtx && (
        <div className="mt-2 flex gap-2 items-center pl-5">
          <select value={context} onChange={e => setContext(e.target.value)}
            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none">
            <option value="">How do they know each other? (optional)</option>
            {CONNECTION_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
          </select>
          <button onClick={yes} disabled={busy}
            className="px-2 py-1 text-[11px] text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 rounded transition-colors disabled:opacity-40">
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

export function Section({ label, count, action, onAction, actionActive, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/40 uppercase tracking-wider text-xs">{label} · {count}</p>
        <button onClick={onAction}
          className="text-[11px] text-white/40 hover:text-white/70 px-2 py-1 rounded transition-colors">
          {actionActive ? 'Cancel' : action}
        </button>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

// ── Add group panel ───────────────────────────────────────────────────────────

export function AddGroupPanel({ personId, onAdded }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [selected, setSelected] = useState(null)
  const [role, setRole]         = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (!query.trim()) return
    const t = setTimeout(async () => {
      const res = await fetch(`/api/groups/?q=${encodeURIComponent(query)}`)
      setResults(await res.json())
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  async function handleFocus() {
    if (!query.trim()) {
      const res = await fetch('/api/groups/')
      setResults(await res.json())
    }
  }

  const roles = selected ? (TYPE_ROLES[selected.type] || []) : []

  async function add() {
    if (!selected) return
    setSaving(true)
    try {
      await fetch(`/api/groups/${selected.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: personId, role: role || null }),
      })
      onAdded()
    } finally { setSaving(false) }
  }

  return (
    <div className="p-3 bg-white/3 border border-white/8 rounded-lg space-y-2 mb-2">
      {selected ? (
        <>
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
            <span className="text-[12px] text-white/70 flex-1">{selected.name}</span>
            <span className="text-[10px] text-white/25">{TYPE_LABELS[selected.type]}</span>
            <button onClick={() => { setSelected(null); setRole('') }} className="text-white/30 hover:text-white/60 text-xs">✕</button>
          </div>
          {roles.length > 0 ? (
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-[12px] text-white outline-none">
              <option value="" className="bg-[#1a1a1a]">Role (optional)</option>
              {roles.map(r => <option key={r} value={r} className="bg-[#1a1a1a]">{r}</option>)}
            </select>
          ) : (
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role (optional)"
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white placeholder-white/25 outline-none" />
          )}
          <button onClick={add} disabled={saving}
            className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white/80 text-[12px] rounded transition-colors disabled:opacity-50">
            {saving ? 'Adding…' : 'Add to group'}
          </button>
        </>
      ) : (
        <>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} onFocus={handleFocus}
            placeholder="Search groups…"
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white placeholder-white/25 outline-none focus:border-white/25" />
          {results.length > 0 && (
            <div className="bg-[#1a1a1a] border border-white/10 rounded overflow-hidden max-h-40 overflow-y-auto">
              {results.map(g => (
                <button key={g.id} onClick={() => { setSelected(g); setQuery(''); setResults([]) }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-white/60 hover:bg-white/5 text-left">
                  <span className="flex-1">{g.name}</span>
                  <span className="text-[10px] text-white/25">{TYPE_LABELS[g.type]}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Add connection panel ──────────────────────────────────────────────────────

function GroupSearch({ value, onChange }) {
  const [query, setQuery]     = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/groups/?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data); setOpen(data.length > 0)
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  async function handleFocus() {
    if (!query.trim()) {
      const res = await fetch('/api/groups/')
      const data = await res.json()
      setResults(data); setOpen(data.length > 0)
    }
  }

  function pick(g) { setQuery(g.name); setOpen(false); onChange({ id: g.id, name: g.name }) }

  return (
    <div className="relative">
      <input value={query} onChange={e => { setQuery(e.target.value); if (value) onChange(null) }}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Met through group? (optional)"
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white placeholder-white/25 outline-none focus:border-white/25" />
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded shadow-xl overflow-hidden max-h-40 overflow-y-auto">
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

export function AddConnectionPanel({ personId, existingIds, onAdded }) {
  const [query, setQuery]               = useState('')
  const [results, setResults]           = useState([])
  const [selected, setSelected]         = useState([])
  const [context, setContext]           = useState('')
  const [since, setSince]               = useState('')
  const [throughGroup, setThroughGroup] = useState(null)
  const [saving, setSaving]             = useState(false)

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
          body: JSON.stringify({ target_id: p.id, context: context || null, since: since || null, through_group_id: throughGroup?.id || null }),
        })
      ))
      onAdded()
    } finally { setSaving(false) }
  }

  const filtered = results.filter(p => p.id !== personId)

  return (
    <div className="p-3 bg-white/3 border border-white/8 rounded-lg space-y-2 mb-2">
      <input autoFocus value={query} onChange={e => setQuery(e.target.value)} onFocus={handleFocus}
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
                  ? <img src={mediaUrl(p.avatar)} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                  : <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />}
                <span>{p.name}{p.known_as ? <span className="text-white/30 ml-1">({p.known_as})</span> : ''}</span>
                {existingIds.has(p.id) && <span className="ml-auto text-[10px] text-white/20">+ group</span>}
              </button>
            )
          })}
        </div>
      )}

      {selected.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1">
            {selected.map(p => (
              <span key={p.id} className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 rounded-full text-[11px] text-blue-300">
                {p.name}
                <button onClick={() => toggle(p)} className="text-blue-300/50 hover:text-blue-300">✕</button>
              </span>
            ))}
          </div>
          <select value={context} onChange={e => setContext(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-[12px] text-white outline-none">
            <option value="" className="bg-[#1a1a1a]">Relationship (optional)</option>
            {CONNECTION_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
          </select>
          <GroupSearch value={throughGroup} onChange={setThroughGroup} />
          <div className="flex gap-2 items-center">
            <input value={since} onChange={e => setSince(e.target.value)} placeholder="Since (e.g. 2022)"
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white placeholder-white/25 outline-none focus:border-white/25" />
            <button onClick={save} disabled={saving}
              className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white/80 text-[12px] rounded transition-colors disabled:opacity-50 shrink-0">
              {saving ? 'Saving…' : `Add ${selected.length}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Shared display components ─────────────────────────────────────────────────

function Field({ label, value }) {
  return (
    <div>
      <p className="text-white/40 uppercase tracking-wider text-xs mb-1">{label}</p>
      <p className="text-white/90">{value}</p>
    </div>
  )
}

function RelGroup({ label, people, relType, onRemove }) {
  if (!people?.length) return null
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wider text-white/40">{label}</p>
      <div className="flex flex-wrap gap-2">
        {people.map(p => (
          <div key={p.id} className="group relative">
            <EntityChip
              to={`/manage/people/${p.id}`}
              avatar={p.avatar ? mediaUrl(p.avatar) : null}
              initials
              text={displayName(p)}
            />
            <button
              onClick={e => { e.preventDefault(); onRemove(p.id, relType) }}
              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-white/40 hover:text-red-400 group-hover:flex"
              aria-label="Remove"
            >×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDate(date, precision) {
  if (!date) return null
  if (precision === 'year') return date.slice(0, 4)
  // A date-only ISO string parses as UTC, so in western timezones it renders a
  // day early. Pin it to local midnight and the calendar date survives.
  const local = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date
  return new Date(local).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function EditForm({ person, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: person.name || '', known_as: person.known_as || '', maiden_name: person.maiden_name || '',
    birth_date: person.birth_date || '', birth_date_precision: person.birth_date_precision || 'full',
    birth_place: person.birth_place || '', death_date: person.death_date || '',
    death_date_precision: person.death_date_precision || 'full', death_place: person.death_place || '',
    burial_place: person.burial_place || '',
    immigration_date: person.immigration_date || '', immigration_place: person.immigration_place || '',
    naturalization_date: person.naturalization_date || '', naturalization_place: person.naturalization_place || '',
    ssn: person.ssn || '',
    is_living: person.is_living ?? true, notes: person.notes || '',
  })
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/people/${person.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          known_as: form.known_as || null, maiden_name: form.maiden_name || null,
          birth_date: form.birth_date || null, birth_place: form.birth_place || null,
          death_date: form.death_date || null, death_place: form.death_place || null,
          burial_place: form.burial_place || null,
          immigration_date: form.immigration_date || null, immigration_place: form.immigration_place || null,
          naturalization_date: form.naturalization_date || null, naturalization_place: form.naturalization_place || null,
          ssn: form.ssn || null,
          notes: form.notes || null,
        }),
      })
      onSaved(await res.json())
    } finally { setSaving(false) }
  }

  const f = field => ({ value: form[field], onChange: e => setForm(p => ({...p, [field]: e.target.value})) })

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11px] text-white/40 block mb-1">Full name *</label>
          <input required {...f('name')} className={INPUT_CLS} /></div>
        <div><label className="text-[11px] text-white/40 block mb-1">Known as</label>
          <input {...f('known_as')} placeholder="Nickname" className={INPUT_CLS} /></div>
      </div>
      <div><label className="text-[11px] text-white/40 block mb-1">Maiden name</label>
        <input {...f('maiden_name')} className={INPUT_CLS} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11px] text-white/40 block mb-1">Birth date</label>
          <input {...f('birth_date')} placeholder="YYYY or YYYY-MM-DD" className={INPUT_CLS} /></div>
        <div><label className="text-[11px] text-white/40 block mb-1">Precision</label>
          <select value={form.birth_date_precision} onChange={e => setForm(p => ({...p, birth_date_precision: e.target.value}))}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-1.5 text-[13px] text-white outline-none">
            <option value="full" className="bg-[#1a1a1a]">Full date</option>
            <option value="year" className="bg-[#1a1a1a]">Year only</option>
          </select></div>
      </div>
      <div><label className="text-[11px] text-white/40 block mb-1">Birthplace</label>
        <input {...f('birth_place')} className={INPUT_CLS} /></div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_living" checked={form.is_living}
          onChange={e => setForm(p => ({...p, is_living: e.target.checked}))} className="accent-blue-500" />
        <label htmlFor="is_living" className="text-[12px] text-white/50">Living</label>
      </div>
      {!form.is_living && (
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] text-white/40 block mb-1">Death date</label>
            <input {...f('death_date')} placeholder="YYYY or YYYY-MM-DD" className={INPUT_CLS} /></div>
          <div><label className="text-[11px] text-white/40 block mb-1">Precision</label>
            <select value={form.death_date_precision} onChange={e => setForm(p => ({...p, death_date_precision: e.target.value}))}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-1.5 text-[13px] text-white outline-none">
              <option value="full" className="bg-[#1a1a1a]">Full date</option>
              <option value="year" className="bg-[#1a1a1a]">Year only</option>
            </select></div>
          <div className="col-span-2"><label className="text-[11px] text-white/40 block mb-1">Last home</label>
            <input {...f('death_place')} className={INPUT_CLS} /></div>
          <div className="col-span-2"><label className="text-[11px] text-white/40 block mb-1">Laid to rest at</label>
            <input {...f('burial_place')} className={INPUT_CLS} /></div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11px] text-white/40 block mb-1">Arrived (year)</label>
          <input {...f('immigration_date')} placeholder="YYYY" className={INPUT_CLS} /></div>
        <div><label className="text-[11px] text-white/40 block mb-1">From / via</label>
          <input {...f('immigration_place')} className={INPUT_CLS} /></div>
        <div><label className="text-[11px] text-white/40 block mb-1">Became citizen (year)</label>
          <input {...f('naturalization_date')} placeholder="YYYY" className={INPUT_CLS} /></div>
        <div><label className="text-[11px] text-white/40 block mb-1">Took citizenship in</label>
          <input {...f('naturalization_place')} className={INPUT_CLS} /></div>
      </div>
      <div><label className="text-[11px] text-white/40 block mb-1">SSN</label>
        <input {...f('ssn')} placeholder="XXX-XX-XXXX" className={INPUT_CLS} /></div>
      <div><label className="text-[11px] text-white/40 block mb-1">Notes</label>
        <textarea rows={3} {...f('notes')} className={`${INPUT_CLS} resize-none`} /></div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white text-[12px] rounded-lg transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[12px] text-white/40 hover:text-white/70">Cancel</button>
      </div>
    </form>
  )
}
