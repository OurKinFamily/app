import { useState, useEffect, useRef } from 'react'
import { useOutletContext, useNavigate, Link } from 'react-router-dom'
import { searchPeople, getPeople } from '../lib/api'
import { mediaUrl } from '../lib/media'
import { displayName } from '../lib/people'
import { useGallery } from '../lib/useGallery'
import { useFavorites } from '../lib/useFavorites'
import { EntityChip } from '../components/new/EntityChip'
import { EntityItem } from '../components/new/EntityItem'
import { MediaGallery } from '../components/new/MediaGallery'
import { PhotoLightbox } from '../components/new/PhotoLightbox'

// ── Constants ────────────────────────────────────────────────────────────────

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
  const { person, relatives, reloadRelatives, setPerson, editing, setEditing } = useOutletContext()
  const navigateOverview = useNavigate()
  const [groups, setGroups]             = useState([])
  const [connections, setConnections]   = useState([])
  const [addingGroup, setAddingGroup]   = useState(false)
  const [addingConn, setAddingConn]     = useState(false)
  const [suggestions, setSuggestions]   = useState([])

  function loadGroups() {
    fetch(`/api/people/${person.id}/groups`).then(r => r.json()).then(setGroups).catch(() => {})
  }
  function loadConnections() {
    fetch(`/api/people/${person.id}/connections`).then(r => r.json()).then(setConnections).catch(() => {})
  }
  function loadSuggestions() {
    fetch(`/api/suggestions/?person_id=${person.id}`)
      .then(r => r.ok ? r.json() : []).then(setSuggestions).catch(() => {})
  }

  useEffect(() => { loadGroups(); loadConnections(); loadSuggestions() }, [person.id])

  async function dismissSuggestion(id, accept) {
    await fetch(`/api/suggestions/${id}/${accept ? 'accept' : 'reject'}`, { method: 'POST' })
    loadSuggestions()
  }

  async function removeRel(targetId, relType) {
    await fetch(`/api/people/${person.id}/relationships`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: targetId, rel_type: relType }),
    })
    reloadRelatives()
  }

  async function removeConnection(otherId) {
    await fetch(`/api/people/${person.id}/connections/${otherId}`, { method: 'DELETE' })
    loadConnections()
  }

  return (
    <>
      {/* Personal info */}
      <div className="max-w-xl space-y-8 mb-8">
        <div>
          <Link to={`/manage/faces/similar?person_id=${person.id}`} title="Find faces that look like this person's avatar"
            className="text-[11px] text-white/40 hover:text-white/70 transition-colors">
            Find similar faces →
          </Link>
        </div>

        {editing ? (
          <EditForm person={person} onSaved={updated => { setPerson(updated); setEditing(false) }} onCancel={() => setEditing(false)} />
        ) : (
          <>
            {person.maiden_name && <p className="text-white/40 text-sm">Née {person.maiden_name}</p>}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {person.birth_date  && <Field label="Born"           value={formatDate(person.birth_date,  person.birth_date_precision)} />}
              {person.birth_place && <Field label="Birthplace"     value={person.birth_place} />}
              {person.death_date  && <Field label="Died"           value={formatDate(person.death_date,  person.death_date_precision)} />}
              {person.death_place && <Field label="Place of death" value={person.death_place} />}
            </div>

            {relatives && (
              <div className="space-y-5">
                <RelGroup label="Parents"  people={relatives.parents}  relType="parent"  onRemove={removeRel} />
                <RelGroup label="Spouses"  people={relatives.spouses}  relType="spouse"  onRemove={removeRel} />
                <RelGroup label="Children" people={relatives.children} relType="child"   onRemove={removeRel} />
                <RelGroup label="Siblings" people={relatives.siblings} relType="sibling" onRemove={removeRel} />
              </div>
            )}

            {person.notes && <p className="text-white/50 text-sm">{person.notes}</p>}
          </>
        )}
      </div>

      {/* Groups + Connections: side by side on md+, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ── Groups ── */}
        <Section label="Groups" count={groups.length} action="+ Add" onAction={() => setAddingGroup(v => !v)} actionActive={addingGroup}>
          {addingGroup && (
            <AddGroupPanel personId={person.id} onAdded={() => { setAddingGroup(false); loadGroups() }} />
          )}
          {suggestions.filter(s => s.type === 'group_membership' && s.person_id === person.id).map(s => (
            <InlineSuggestion key={s.id} suggestion={s} onYes={async (_ctx) => {
              await fetch(`/api/groups/${s.target?.id}/members`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ person_id: person.id, role: null }),
              })
              await dismissSuggestion(s.id, true)
              loadGroups()
            }} onNo={() => dismissSuggestion(s.id, false)} />
          ))}
          {groups.map(g => (
            <Link key={g.id} to={`/manage/groups/${g.id}`}
              className="flex items-center gap-3 p-2.5 bg-white/3 hover:bg-white/6 border border-white/6 rounded-lg transition-colors group">
              <div className="flex-1 min-w-0">
                <span className="text-[13px] text-white/70 group-hover:text-white">{g.name}</span>
                {g.role && <span className="text-[11px] text-white/30 ml-2">{g.role}</span>}
                <div className="text-[11px] text-white/25 mt-0.5">
                  {TYPE_LABELS[g.type] || g.type}{g.year ? ` · ${g.year}` : ''}{g.location_name ? ` · ${g.location_name}` : ''}
                </div>
              </div>
            </Link>
          ))}
          {groups.length === 0 && !addingGroup && <p className="text-[12px] text-white/25">No groups yet.</p>}
        </Section>

        {/* ── Connections ── */}
        <Section label="Connections" count={connections.length} action="+ Add" onAction={() => setAddingConn(v => !v)} actionActive={addingConn}>
          {addingConn && (
            <AddConnectionPanel
              personId={person.id}
              existingIds={new Set(connections.map(c => c.id))}
              onAdded={() => { setAddingConn(false); loadConnections() }}
            />
          )}
          {suggestions.filter(s => s.type === 'connection' && (s.person_id === person.id || s.target_id === person.id)).map(s => {
            const otherId   = s.person_id === person.id ? s.target_id : s.person_id
            const otherNode = s.person_id === person.id ? s.target    : s.person
            return (
              <InlineSuggestion key={s.id} suggestion={s} otherPerson={otherNode} onYes={async (context) => {
                await fetch(`/api/people/${person.id}/connections`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ target_id: otherId, context: context || null }),
                })
                await dismissSuggestion(s.id, true)
                loadConnections()
              }} onNo={() => dismissSuggestion(s.id, false)} />
            )
          })}
          {connections.map(c => (
            <div key={c.id} className="group relative">
              <EntityItem
                avatar={c.avatar ? mediaUrl(c.avatar) : null}
                initials
                text={displayName(c)}
                secondary={
                  <span>
                    {c.context && <span>{c.context}</span>}
                    {c.through_groups?.map(g => (
                      <Link key={g.id} to={`/manage/groups/${g.id}`} className="ml-2 text-white/30 hover:text-white/60">via {g.name}</Link>
                    ))}
                  </span>
                }
                trailing={c.since || undefined}
                onClick={() => navigateOverview(`/manage/people/${c.id}`)}
              />
              <button
                onClick={e => { e.preventDefault(); removeConnection(c.id) }}
                className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded px-2 text-[11px] text-white/30 hover:text-red-400 group-hover:block"
              >Remove</button>
            </div>
          ))}
          {connections.length === 0 && !addingConn && <p className="text-[12px] text-white/25">No connections yet.</p>}
        </Section>

      </div>

      <PersonGalleryInline personId={person.id} />
    </>
  )
}

// ── Inline gallery ────────────────────────────────────────────────────────────

function PersonGalleryInline({ personId }) {
  const { media, loading, hasMoreOlder, loadOlder, fillGap } = useGallery({
    params: { person_ids: personId },
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
      <p className="text-white/40 uppercase tracking-wider text-xs mb-3">
        Photos · {media.length.toLocaleString()}{hasMoreOlder ? '+' : ''}
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
        />
      )}
    </div>
  )
}

// ── Inline suggestion chip ────────────────────────────────────────────────────

function InlineSuggestion({ suggestion: s, otherPerson, onYes, onNo }) {
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
            ? <img src={`/api/media/${target.avatar}`} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
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

function Section({ label, count, action, onAction, actionActive, children }) {
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

function AddGroupPanel({ personId, onAdded }) {
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

function AddConnectionPanel({ personId, existingIds, onAdded }) {
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
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function EditForm({ person, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: person.name || '', known_as: person.known_as || '', maiden_name: person.maiden_name || '',
    birth_date: person.birth_date || '', birth_date_precision: person.birth_date_precision || 'full',
    birth_place: person.birth_place || '', death_date: person.death_date || '',
    death_date_precision: person.death_date_precision || 'full', death_place: person.death_place || '',
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
          <div className="col-span-2"><label className="text-[11px] text-white/40 block mb-1">Place of death</label>
            <input {...f('death_place')} className={INPUT_CLS} /></div>
        </div>
      )}
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
