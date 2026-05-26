import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPeople } from '../lib/api'
import { mediaUrl } from '../lib/media'
import { displayName, otherName } from '../lib/people'
import { Container } from '../components/new/Container'
import { Input } from '../components/new/Input'
import { Button } from '../components/new/Button'
import { EntityItem } from '../components/new/EntityItem'
import { AddPersonModal } from '../components/AddPersonModal'

export function PeoplePage() {
  const [people, setPeople] = useState([])
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { getPeople().then(setPeople).catch(() => {}) }, [])

  const handleCreated = person => {
    setShowModal(false)
    navigate(`/manage/people/${person.id}`)
  }

  const q = query.trim().toLowerCase()
  const filtered = q
    ? people.filter(p =>
        p.name.toLowerCase().includes(q) || (p.known_as || '').toLowerCase().includes(q)
      )
    : people

  return (
    <Container className="py-6">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-white">People</h1>
        <span className="text-[12px] text-white/25">{people.length.toLocaleString()}</span>
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          className="ml-auto max-w-xs"
        />
        <Button variant="secondary" size="sm" onClick={() => setShowModal(true)}>+ Add person</Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {filtered.map(p => (
          <EntityItem
            key={p.id}
            avatar={p.avatar ? mediaUrl(p.avatar) : null}
            initials
            text={displayName(p)}
            secondary={otherName(p) || (p.birth_date ? `b. ${p.birth_date.slice(0, 4)}` : null)}
            onClick={() => navigate(`/manage/people/${p.id}`)}
          />
        ))}
      </div>

      {showModal && <AddPersonModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </Container>
  )
}
