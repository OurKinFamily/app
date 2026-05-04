import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPeople } from '../lib/api'
import { PersonCard } from '../components/PersonCard'

export function PeoplePage() {
  const [people, setPeople] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getPeople().then(setPeople)
  }, [])

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold text-white mb-8">People</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {people.map(p => (
          <PersonCard key={p.id} person={p} onClick={() => navigate(`/manage/people/${p.id}`)} />
        ))}
      </div>
    </div>
  )
}
