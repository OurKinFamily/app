import { useState, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import { searchPeople, createPerson, addRelationship } from '../lib/api'

const LABELS = {
  spouse: 'Spouse',
  child: 'Child',
  sibling: 'Sibling',
  parent: 'Parent',
}

export function AddRelativeModal({ action, onClose, onSuccess }) {
  const [mode, setMode] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [name, setName] = useState('')
  const [knownAs, setKnownAs] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [mode])

  useEffect(() => {
    if (query.length < 1) { setResults([]); return }
    const t = setTimeout(() => {
      searchPeople(query).then(setResults).catch(e => {
        console.error('Search error:', e)
        setResults([])
      })
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  const canSubmit = mode === 'search' ? !!selected : !!name.trim()

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      let targetId
      if (mode === 'search') {
        targetId = selected.id
      } else {
        const p = await createPerson({
          name: name.trim(),
          known_as: knownAs.trim() || null,
          birth_date: birthDate.trim() || null,
        })
        targetId = p.id
      }
      await addRelationship(action.personId, {
        rel_type: action.type,
        target_id: targetId,
        parent_ids: action.parentIds || [],
      })
      onSuccess()
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-white/15 rounded-2xl p-6 w-[440px] shadow-2xl">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-base">Add {LABELS[action.type]}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-4">
          <button
            onClick={() => setMode('search')}
            className={`flex-1 py-1.5 rounded-md text-sm transition-colors ${
              mode === 'search' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            Search existing
          </button>
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-1.5 rounded-md text-sm transition-colors ${
              mode === 'create' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            Create new
          </button>
        </div>

        {mode === 'search' ? (
          <div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 mb-2">
              <Search size={13} className="text-white/30 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null) }}
                placeholder="Search by name…"
                className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder-white/30 outline-none"
              />
            </div>
            <div className="space-y-0.5 max-h-52 overflow-y-auto">
              {results.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selected?.id === p.id
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="font-medium">{p.known_as || p.name}</span>
                  {p.known_as && p.known_as !== p.name && (
                    <span className="text-white/35 ml-2 text-xs">{p.name}</span>
                  )}
                  {p.birth_date && (
                    <span className="text-white/30 ml-2 text-xs">{p.birth_date.slice(0, 4)}</span>
                  )}
                </button>
              ))}
              {query.length >= 1 && results.length === 0 && (
                <p className="text-white/30 text-sm text-center py-4">No results for "{query}"</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name *"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors"
            />
            <input
              value={knownAs}
              onChange={e => setKnownAs(e.target.value)}
              placeholder="Known as (nickname)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors"
            />
            <input
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              placeholder="Birth date (YYYY or YYYY-MM-DD)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors"
            />
          </div>
        )}

        {error && <p className="text-red-400/80 text-xs mt-3">{error}</p>}

        <div className="flex gap-2.5 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !canSubmit}
            className="flex-1 py-2 rounded-lg text-sm bg-white/10 text-white hover:bg-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>

      </div>
    </div>
  )
}
