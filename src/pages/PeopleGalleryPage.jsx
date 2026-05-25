import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GalleryGrid } from '../components/GalleryGrid'
import { searchPeople } from '../lib/api'

function Chip({ person, onRemove }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-[13px] text-white/80">
      {person.avatar
        ? <img src={`/api/media/${person.avatar}`} alt="" className="w-4 h-4 rounded-full object-cover" />
        : <div className="w-4 h-4 rounded-full bg-white/10" />
      }
      <span>{person.known_as || person.name}</span>
      <button onClick={() => onRemove(person.id)} className="text-white/40 hover:text-white/80 leading-none ml-0.5">×</button>
    </div>
  )
}

export function PeopleGalleryPage() {
  const [selected, setSelected]       = useState([])
  const [query, setQuery]             = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSugg, setShowSugg]       = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedIds = selected.map(p => p.id)

  // Restore selected people from ?people= on mount
  useEffect(() => {
    const ids = searchParams.get('people')
    if (!ids) return
    Promise.all(
      ids.split(',').filter(Boolean).map(id =>
        fetch(`/api/people/${id}`).then(r => r.ok ? r.json() : null)
      )
    ).then(results => setSelected(results.filter(Boolean)))
  }, [])

  // Sync ?people= param when selection changes (preserve ?photo=)
  useEffect(() => {
    setSearchParams(prev => {
      const n = new URLSearchParams(prev)
      if (selectedIds.length) n.set('people', selectedIds.join(','))
      else n.delete('people')
      return n
    }, { replace: true })
  }, [selectedIds.join(',')])

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      const results = await searchPeople(query).catch(() => [])
      setSuggestions(results.filter(p => !selectedIds.includes(p.id)))
    }, 200)
    return () => clearTimeout(t)
  }, [query, selectedIds.join(',')])

  const selectPerson = useCallback((person) => {
    setSelected(prev => prev.find(p => p.id === person.id) ? prev : [...prev, person])
    setQuery('')
    setSuggestions([])
    setShowSugg(false)
  }, [])

  const removePerson = useCallback((id) => {
    setSelected(prev => prev.filter(p => p.id !== id))
  }, [])

  const params = selectedIds.length ? { person_ids: selectedIds.join(',') } : {}

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white mb-4">People</h1>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowSugg(true) }}
          onFocus={() => setShowSugg(true)}
          onBlur={() => setTimeout(() => setShowSugg(false), 150)}
          placeholder="Search people…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/25 outline-none focus:border-white/25"
        />
        {showSugg && suggestions.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden z-20 shadow-xl">
            {suggestions.map(p => (
              <button
                key={p.id}
                onMouseDown={() => selectPerson(p)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/70 hover:bg-white/5 hover:text-white text-left"
              >
                {p.avatar
                  ? <img src={`/api/media/${p.avatar}`} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                  : <div className="w-6 h-6 rounded-full bg-white/10 shrink-0" />
                }
                <span>
                  {p.known_as && <span className="text-white/40 mr-1">({p.known_as})</span>}
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selected.map(p => <Chip key={p.id} person={p} onRemove={removePerson} />)}
        </div>
      )}

      {!selected.length
        ? <p className="text-white/25 text-sm">Search for a person above to browse their photos.</p>
        : <GalleryGrid params={params} />
      }
    </div>
  )
}
