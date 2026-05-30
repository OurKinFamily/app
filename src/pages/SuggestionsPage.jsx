import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Container } from '../components/Container'
import { Input } from '../components/Input'
import { Tag } from '../components/Tag'
import { mediaUrl } from '../lib/media'

const TYPE_LABELS = {
  group_membership:  'Group',
  relationship:      'Family',
  connection:        'Connection',
  birth_year:        'Birth Year',
  maiden_name:       'Maiden Name',
  location:          'Group Location',
  group_year:        'Group Year',
  missing_ancestry:  'No Ancestry',
}

const TYPE_TONES = {
  group_membership:  'green',
  relationship:      'purple',
  connection:        'blue',
  birth_year:        'amber',
  maiden_name:       'pink',
  location:          'cyan',
  group_year:        'orange',
  missing_ancestry:  'slate',
}

const CONNECTION_TYPES = [
  'Friend', 'Close Friend', 'Childhood Friend',
  'Coworker', 'Colleague', 'Business Partner',
  'Neighbor', 'Acquaintance',
  'Family Friend', 'Classmate', 'Teammate',
  'Mentor', 'Mentee', 'Other',
]

const PAGE_SIZE = 50

export function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [generating, setGenerating]   = useState(false)
  const [filter, setFilter]           = useState('all')
  const [shown, setShown]             = useState(PAGE_SIZE)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/suggestions/')
    if (res.ok) setSuggestions(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function generate() {
    setGenerating(true)
    await fetch('/api/suggestions/generate', { method: 'POST' })
    setTimeout(() => { setGenerating(false); load() }, 2000)
  }

  function remove(id) {
    setSuggestions(s => s.filter(x => x.id !== id))
  }

  const filtered = filter === 'all'
    ? suggestions
    : suggestions.filter(s => s.type === filter)

  const visible = filtered.slice(0, shown)
  const types = [...new Set(suggestions.map(s => s.type))]

  useEffect(() => { setShown(PAGE_SIZE) }, [filter])

  return (
    <Container className="py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-medium text-white/80">Suggestions</h1>
          <Tag tone="amber">{suggestions.length} pending</Tag>
        </div>
        <Button variant="secondary" size="sm" onClick={generate} disabled={generating}>
          {generating ? 'Generating…' : 'Regenerate'}
        </Button>
      </div>

      {types.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All ({suggestions.length})
          </FilterChip>
          {types.map(t => (
            <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)}>
              {TYPE_LABELS[t] || t} ({suggestions.filter(s => s.type === t).length})
            </FilterChip>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-white/30">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[13px] text-white/25">No suggestions. Click Regenerate to scan for new ones.</p>
      ) : (
        <>
          <div className="space-y-2">
            {visible.map(s => s.type === 'missing_ancestry'
              ? <AncestryLinkCard key={s.id} suggestion={s} onDone={remove} />
              : <SuggestionCard key={s.id} suggestion={s} onDone={remove} />
            )}
          </div>
          {shown < filtered.length && (
            <div className="mt-4 flex items-center justify-between text-[12px] text-white/40">
              <span>Showing {visible.length.toLocaleString()} of {filtered.length.toLocaleString()}</span>
              <Button variant="secondary" size="sm" onClick={() => setShown(s => s + PAGE_SIZE)}>
                Show {Math.min(PAGE_SIZE, filtered.length - shown)} more
              </Button>
            </div>
          )}
        </>
      )}
    </Container>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-full px-2.5 py-1 text-[11px] transition-colors ' +
        (active ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70')
      }
    >
      {children}
    </button>
  )
}

function Avatar({ person, px = 22 }) {
  if (!person) return null
  const style = { width: px, height: px, borderRadius: '50%', flexShrink: 0 }
  if (person.avatar)
    return <img src={mediaUrl(person.avatar)} alt="" style={{ ...style, objectFit: 'cover' }} />
  return (
    <div
      style={{ ...style, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}
    >
      {(person.known_as || person.name || '?').slice(0, 1).toUpperCase()}
    </div>
  )
}

function AncestryLinkCard({ suggestion: s, onDone }) {
  const name = s.person ? s.person.name : '?'
  async function dismiss() {
    await fetch(`/api/suggestions/${s.id}/reject`, { method: 'POST' })
    onDone(s.id)
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-2.5">
      {s.person && <Avatar person={s.person} />}
      <span className="flex-1 text-[13px] text-white/70">{name}</span>
      <Link
        to={`/manage/people/${s.person_id}/ancestry`}
        onClick={async () => { await fetch(`/api/suggestions/${s.id}/accept`, { method: 'POST' }); onDone(s.id) }}
        className="text-[12px] text-violet-400 transition-colors hover:text-violet-300"
      >
        Add ancestry →
      </Link>
      <button onClick={dismiss} className="text-[11px] text-white/20 transition-colors hover:text-white/50">
        Dismiss
      </button>
    </div>
  )
}

function SuggestionCard({ suggestion: s, onDone }) {
  const [busy, setBusy]             = useState(false)
  const [relType, setRelType]       = useState('')
  const [showRel, setShowRel]       = useState(false)
  const [connCtx, setConnCtx]       = useState('')
  const [showConn, setShowConn]     = useState(false)
  const [maiden, setMaiden]         = useState('')
  const [showMaiden, setShowMaiden] = useState(false)
  const navigate = useNavigate()

  async function reject() {
    setBusy(true)
    await fetch(`/api/suggestions/${s.id}/reject`, { method: 'POST' })
    onDone(s.id)
  }

  async function accept() {
    if (s.type === 'connection'  && !showConn)   { setShowConn(true);   return }
    if (s.type === 'relationship' && !showRel)   { setShowRel(true);    return }
    if (s.type === 'maiden_name'  && !showMaiden) { setShowMaiden(true); return }

    setBusy(true)
    try {
      if (s.type === 'group_membership') {
        await fetch(`/api/groups/${s.target?.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ person_id: s.person_id, role: null }),
        })
      } else if (s.type === 'connection') {
        await fetch(`/api/people/${s.person_id}/connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_id: s.target_id, context: connCtx || null }),
        })
      } else if (s.type === 'relationship') {
        await fetch(`/api/people/${s.person_id}/relationships`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rel_type: relType, target_id: s.target_id }),
        })
      } else if (s.type === 'birth_year') {
        const year = s.metadata?.suggested_year
        if (year) {
          await fetch(`/api/people/${s.person_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: s.person?.name, birth_date: String(year), birth_date_precision: 'year',
              known_as: s.person?.known_as || null, is_living: s.person?.is_living ?? true,
            }),
          })
        }
      } else if (s.type === 'maiden_name') {
        await fetch(`/api/people/${s.person_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: s.person?.name, maiden_name: maiden,
            known_as: s.person?.known_as || null, is_living: s.person?.is_living ?? true,
          }),
        })
      } else if (s.type === 'location') {
        const loc = s.metadata?.suggested_location
        if (loc) {
          await fetch(`/api/groups/${s.target_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: s.target?.name, type: s.target?.type, location_name: loc }),
          })
        }
      } else if (s.type === 'group_year') {
        const year = s.metadata?.suggested_year
        if (year) {
          await fetch(`/api/groups/${s.target_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: s.target?.name, type: s.target?.type, year }),
          })
        }
      }
      await fetch(`/api/suggestions/${s.id}/accept`, { method: 'POST' })
      onDone(s.id)
    } catch {
      setBusy(false)
    }
  }

  const personName = s.person ? s.person.name : '?'
  const targetName = s.target ? s.target.name : '?'
  const year = s.metadata?.suggested_year
  const loc  = s.metadata?.suggested_location

  const question = {
    connection:       `Do ${personName} and ${targetName} know each other?`,
    relationship:     `Are ${personName} and ${targetName} related?`,
    group_membership: `Is ${personName} a member of ${targetName}?`,
    birth_year:       `Was ${personName} born around ${year}?`,
    maiden_name:      `Does ${personName} have a maiden name?`,
    location:         `Is ${targetName} based in ${loc}?`,
    group_year:       `Did ${targetName} graduate around ${year}?`,
  }[s.type] || s.reason

  const selectCls = 'rounded border border-white/15 bg-[#1a1a1a] px-2 py-1 text-[12px] text-white outline-none focus:border-white/30'

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {s.person && <Avatar person={s.person} />}
            {s.target_kind === 'person' && s.target && <Avatar person={s.target} />}
            <p className="text-[13px] font-medium text-white/85">{question}</p>
            <Tag tone={TYPE_TONES[s.type] || 'slate'}>{TYPE_LABELS[s.type] || s.type}</Tag>
          </div>

          <p className="mb-2 ml-0.5 text-[11px] text-white/35">{s.reason}</p>

          {showConn && (
            <div className="mb-2 flex gap-2">
              <select value={connCtx} onChange={e => setConnCtx(e.target.value)} className={selectCls}>
                <option value="">How do they know each other?</option>
                {CONNECTION_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
              </select>
            </div>
          )}

          {showRel && (
            <div className="mb-2 flex gap-2">
              <select value={relType} onChange={e => setRelType(e.target.value)} className={selectCls}>
                <option value="">What is the relationship?</option>
                <option value="parent"  className="bg-[#1a1a1a]">{personName} is {targetName}'s parent</option>
                <option value="child"   className="bg-[#1a1a1a]">{personName} is {targetName}'s child</option>
                <option value="spouse"  className="bg-[#1a1a1a]">{personName} is {targetName}'s spouse / partner</option>
                <option value="sibling" className="bg-[#1a1a1a]">{personName} is {targetName}'s sibling</option>
              </select>
            </div>
          )}

          {showMaiden && (
            <div className="mb-2 flex gap-2">
              <Input autoFocus value={maiden} onChange={e => setMaiden(e.target.value)} placeholder="Enter maiden name…" />
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="h-0.5 w-12 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-white/25" style={{ width: `${(s.confidence || 0) * 100}%` }} />
            </div>
            <span className="text-[10px] text-white/20">{Math.round((s.confidence || 0) * 100)}% confidence</span>
          </div>
        </div>

        <div className="mt-0.5 flex shrink-0 gap-1.5">
          <Button
            size="sm"
            onClick={accept}
            disabled={busy || (showRel && !relType) || (showMaiden && !maiden.trim())}
            className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
          >
            Yes
          </Button>
          <Button size="sm" variant="secondary" onClick={reject} disabled={busy}>
            No
          </Button>
        </div>
      </div>
    </div>
  )
}
