import { useEffect, useState } from 'react'
import { getPeople, getRelatives } from '../lib/api'
import { PersonCard } from '../components/PersonCard'

export function PeoplePage() {
  const [people, setPeople] = useState([])
  const [selected, setSelected] = useState(null)
  const [relatives, setRelatives] = useState(null)

  useEffect(() => {
    getPeople().then(setPeople)
  }, [])

  async function handleSelect(person) {
    setSelected(person)
    setRelatives(null)
    const rel = await getRelatives(person.id)
    setRelatives(rel)
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold text-white mb-8">People</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {people.map(p => (
          <PersonCard key={p.id} person={p} onClick={handleSelect} />
        ))}
      </div>

      {selected && (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 max-w-xl">
          <h2 className="text-xl font-semibold text-white mb-1">{selected.name}</h2>
          {selected.known_as && (
            <p className="text-white/50 text-sm mb-4">Known as "{selected.known_as}"</p>
          )}

          {relatives ? (
            <div className="space-y-4 text-sm">
              <RelGroup label="Parents" people={relatives.parents} />
              <RelGroup label="Children" people={relatives.children} />
              <RelGroup label="Spouses" people={relatives.spouses} />
            </div>
          ) : (
            <p className="text-white/40 text-sm">Loading relatives…</p>
          )}
        </div>
      )}
    </div>
  )
}

function RelGroup({ label, people }) {
  if (!people?.length) return null
  return (
    <div>
      <p className="text-white/40 uppercase tracking-wider text-xs mb-1">{label}</p>
      <div className="flex flex-wrap gap-2">
        {people.map(p => (
          <span key={p.id} className="rounded-lg bg-white/10 px-3 py-1 text-white/80">
            {p.known_as || p.name}
          </span>
        ))}
      </div>
    </div>
  )
}
