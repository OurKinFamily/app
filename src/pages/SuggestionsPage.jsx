import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

const TYPE_COLORS = {
  group_membership:  'text-emerald-400 bg-emerald-400/10',
  relationship:      'text-violet-400 bg-violet-400/10',
  connection:        'text-blue-400 bg-blue-400/10',
  birth_year:        'text-amber-400 bg-amber-400/10',
  maiden_name:       'text-pink-400 bg-pink-400/10',
  location:          'text-cyan-400 bg-cyan-400/10',
  group_year:        'text-orange-400 bg-orange-400/10',
  missing_ancestry:  'text-white/40 bg-white/5',
}

const REL_TYPES = ['parent', 'child', 'spouse', 'sibling']

const CONNECTION_TYPES = [
  'Friend', 'Close Friend', 'Childhood Friend',
  'Coworker', 'Colleague', 'Business Partner',
  'Neighbor', 'Acquaintance',
  'Family Friend', 'Classmate', 'Teammate',
  'Mentor', 'Mentee', 'Other',
]

export function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [generating, setGenerating]   = useState(false)
  const [filter, setFilter]           = useState('all')

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

  const types = [...new Set(suggestions.map(s => s.type))]

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Suggestions</h1>
          <p className="text-white/40 text-sm mt-0.5">{suggestions.length} pending</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white/80 text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Regenerate'}
        </button>
      </div>

      {/* Type filter */}
      {types.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${filter === 'all' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            All ({suggestions.length})
          </button>
          {types.map(t => (
            <button key={t}
              onClick={() => setFilter(t)}
              className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${filter === t ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              {TYPE_LABELS[t] || t} ({suggestions.filter(s => s.type === t).length})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-white/30 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-white/25 text-sm">No suggestions. Click Regenerate to scan for new ones.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => s.type === 'missing_ancestry'
            ? <AncestryLinkCard key={s.id} suggestion={s} onDone={remove} />
            : <SuggestionCard key={s.id} suggestion={s} onDone={remove} onReload={load} />
          )}
        </div>
      )}
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
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white/3 border border-white/8 rounded-xl">
      {s.person && <Avatar person={s.person} px={22} />}
      <span className="text-[13px] text-white/70 flex-1">{name}</span>
      <Link
        to={`/manage/people/${s.person_id}/ancestry`}
        onClick={async () => { await fetch(`/api/suggestions/${s.id}/accept`, { method: 'POST' }); onDone(s.id) }}
        className="text-[12px] text-violet-400 hover:text-violet-300 transition-colors"
      >
        Add ancestry →
      </Link>
      <button onClick={dismiss} className="text-[11px] text-white/20 hover:text-white/50 transition-colors">
        Dismiss
      </button>
    </div>
  )
}

function Avatar({ person, px = 28 }) {
  if (!person) return null
  const style = { width: px, height: px, borderRadius: '50%', flexShrink: 0 }
  if (person.avatar)
    return <img src={`/api/media/${person.avatar}`} alt="" style={{ ...style, objectFit: 'cover' }} />
  return (
    <div style={{ ...style, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
      {(person.known_as || person.name || '?').slice(0, 1).toUpperCase()}
    </div>
  )
}

function SuggestionCard({ suggestion: s, onDone, onReload }) {
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
    // Types requiring extra input
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

  return (
    <div className="p-4 bg-white/3 border border-white/8 rounded-xl">
      <div className="flex items-start gap-3">

        <div className="flex-1 min-w-0">
          {/* Question — the main prompt */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {s.person && <Avatar person={s.person} px={22} />}
            {s.target_kind === 'person' && s.target && <Avatar person={s.target} px={22} />}
            <p className="text-[13px] text-white/85 font-medium">{question}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[s.type] || 'text-white/40 bg-white/5'}`}>
              {TYPE_LABELS[s.type] || s.type}
            </span>
          </div>

          {/* Evidence / reason */}
          <p className="text-[11px] text-white/35 mb-2 ml-0.5">{s.reason}</p>

          {/* Extra input: connection context */}
          {showConn && (
            <div className="flex gap-2 mb-2">
              <select value={connCtx} onChange={e => setConnCtx(e.target.value)}
                className="bg-[#1a1a1a] border border-white/15 rounded px-2 py-1 text-[12px] text-white outline-none">
                <option value="">How do they know each other?</option>
                {CONNECTION_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
              </select>
            </div>
          )}

          {/* Extra input: relationship type */}
          {showRel && (
            <div className="flex gap-2 mb-2">
              <select value={relType} onChange={e => setRelType(e.target.value)}
                className="bg-[#1a1a1a] border border-white/15 rounded px-2 py-1 text-[12px] text-white outline-none">
                <option value="">What is the relationship?</option>
                <option value="parent"  className="bg-[#1a1a1a]">{personName} is {targetName}'s parent</option>
                <option value="child"   className="bg-[#1a1a1a]">{personName} is {targetName}'s child</option>
                <option value="spouse"  className="bg-[#1a1a1a]">{personName} is {targetName}'s spouse / partner</option>
                <option value="sibling" className="bg-[#1a1a1a]">{personName} is {targetName}'s sibling</option>
              </select>
            </div>
          )}

          {/* Extra input: maiden name */}
          {showMaiden && (
            <div className="flex gap-2 mb-2">
              <input autoFocus value={maiden} onChange={e => setMaiden(e.target.value)}
                placeholder="Enter maiden name…"
                className="bg-white/5 border border-white/15 rounded px-2 py-1 text-[12px] text-white placeholder-white/25 outline-none focus:border-white/30" />
            </div>
          )}

          {/* Confidence */}
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-12 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white/25 rounded-full" style={{ width: `${(s.confidence || 0) * 100}%` }} />
            </div>
            <span className="text-[10px] text-white/20">{Math.round((s.confidence || 0) * 100)}% confidence</span>
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0 mt-0.5">
          <button onClick={accept} disabled={busy || (showRel && !relType) || (showMaiden && !maiden.trim())}
            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[12px] rounded-lg transition-colors disabled:opacity-40">
            Yes
          </button>
          <button onClick={reject} disabled={busy}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 text-[12px] rounded-lg transition-colors disabled:opacity-40">
            No
          </button>
        </div>
      </div>
    </div>
  )
}
