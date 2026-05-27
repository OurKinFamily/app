import { useState } from 'react'
import { searchPeople, createPerson } from '../lib/api'
import { mediaUrl } from '../lib/media'
import { Select } from './Select'

function toOption(p) {
  return {
    value: p.id,
    text: p.known_as || p.name,
    avatar: p.avatar ? mediaUrl(p.avatar) : null,
    initials: true,
    label: (
      <>
        {p.known_as && p.known_as !== p.name && <span className="text-white/35">({p.known_as}) </span>}
        {p.name}
      </>
    ),
  }
}

// Floating "assign face" popover anchored to (x, y) in viewport coords.
// Searches people and POSTs the assignment, then calls onAssigned + onClose.
export function FaceAssignPopover({ face, photoPath, x, y, onClose, onAssigned }) {
  const [results, setResults]   = useState([])
  const [query,   setQuery]     = useState('')
  const [creating, setCreating] = useState(false)

  const onSearch = async q => {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    try {
      const r = await searchPeople(q)
      setResults(r.map(toOption))
    } catch { setResults([]) }
  }

  async function assignToPerson(personId) {
    try {
      await fetch(`/api/people/${personId}/faces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_path: photoPath,
          face_index: face.face_index,
          crop_path:  face.crop_path,
        }),
      })
    } catch { /* ignore network errors */ }
    onAssigned?.()
    onClose?.()
  }

  const onPick = option => assignToPerson(option.value)

  const createAndAssign = async () => {
    if (!query.trim() || creating) return
    setCreating(true)
    try {
      const person = await createPerson({ name: query.trim() })
      await assignToPerson(person.id)
    } catch (e) {
      alert('Failed to create person: ' + e.message)
      setCreating(false)
    }
  }

  const W = 340
  const left = Math.max(8, Math.min(x, window.innerWidth - W - 8))
  const top = Math.max(8, Math.min(y, window.innerHeight - 80))

  return (
    <>
      <div className="fixed inset-0 z-[2090]" onClick={onClose} />
      <div
        className="fixed z-[2100] rounded-lg border border-white/15 bg-zinc-900 p-2 shadow-2xl"
        style={{ left, top, width: W }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          {face.crop_url && (
            <img src={face.crop_url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            {query.trim() && !results.some(o => o.text?.toLowerCase() === query.trim().toLowerCase()) && (
              <button
                onClick={createAndAssign}
                disabled={creating}
                className="block w-full text-left text-[12px] text-blue-400/80 transition-colors hover:text-blue-300 disabled:opacity-50"
              >
                {creating ? `Creating "${query.trim()}"…` : `+ Create new person "${query.trim()}"`}
              </button>
            )}
            <Select
              autoFocus
              options={results}
              value={null}
              onChange={onPick}
              onQueryChange={onSearch}
              placeholder="Search a person to assign…"
            />
          </div>
        </div>
      </div>
    </>
  )
}
