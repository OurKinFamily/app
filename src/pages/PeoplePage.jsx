import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPeople } from '../lib/api'
import { PersonCard } from '../components/PersonCard'
import { AddPersonModal } from '../components/AddPersonModal'

export function PeoplePage() {
  const [people, setPeople]     = useState([])
  const [query, setQuery]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getPeople().then(setPeople)
  }, [])

  function handleCreated(person) {
    setShowModal(false)
    navigate(`/manage/people/${person.id}`)
  }

  const filtered = query.trim()
    ? people.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.known_as || '').toLowerCase().includes(query.toLowerCase())
      )
    : people

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-semibold text-white">People</h1>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          className="flex-1 max-w-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-white/25"
        />
        <button
          onClick={() => setShowModal(true)}
          className="ml-auto px-3 py-1.5 text-[13px] text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded-lg transition-colors"
        >
          + Add person
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(p => (
          <PersonCard key={p.id} person={p} onClick={() => navigate(`/manage/people/${p.id}`)} />
        ))}
      </div>

      {showModal && (
        <AddPersonModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
