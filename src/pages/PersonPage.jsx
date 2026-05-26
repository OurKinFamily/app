import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Outlet, NavLink, Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { getPerson, getRelatives } from '../lib/api'
import { mediaUrl } from '../lib/media'
import { cn } from '../lib/cn'
import { Container } from '../components/Container'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { AvatarPicker } from '../components/AvatarPicker'

const TABS = [
  { to: 'overview', label: 'Overview' },
  { to: 'ancestry', label: 'Ancestry' },
  { to: 'scrapbook', label: 'Scrapbook' },
  { to: 'travel', label: 'Travel' },
  { to: 'ai', label: 'AI' },
]

export function PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [person, setPerson] = useState(null)
  const [relatives, setRelatives] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState(false)

  const reloadRelatives = useCallback(() => { getRelatives(id).then(setRelatives) }, [id])

  useEffect(() => {
    setPerson(null)
    setRelatives(null)
    getPerson(id).then(setPerson).catch(() => navigate('/gallery/people'))
    getRelatives(id).then(setRelatives).catch(() => {})
  }, [id])

  if (!person) return <div className="p-8 text-white/40">Loading…</div>

  return (
    <Container className="py-6">
      <Link to="/gallery/people" className="text-[12px] text-white/40 hover:text-white/70">← People</Link>

      <div className="mt-3 mb-6 flex items-center gap-4">
        <button
          onClick={() => setPickerOpen(true)}
          className="group relative h-16 w-16 shrink-0"
          aria-label="Change avatar"
        >
          <Avatar
            src={person.avatar ? mediaUrl(person.avatar) : null}
            name={person.name}
            size="xl"
            className="ring-2"
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Pencil size={18} className="text-white" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-semibold text-white">{person.name}</h1>
          {person.known_as && person.known_as !== person.name && (
            <p className="mt-1 text-white/50">Known as &ldquo;{person.known_as}&rdquo;</p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditing(v => !v)}>
          {editing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      <nav className="hide-scrollbar mb-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-white/10">
        {TABS.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => cn(
              '-mb-px shrink-0 border-b-2 px-4 py-2 text-[13px] transition-colors',
              isActive
                ? 'border-white text-white'
                : 'border-transparent text-white/50 hover:text-white/80',
            )}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ person, setPerson, relatives, reloadRelatives, editing, setEditing }} />

      {pickerOpen && (
        <AvatarPicker
          person={person}
          onClose={() => setPickerOpen(false)}
          onSaved={cropPath => setPerson(p => ({ ...p, avatar: cropPath }))}
        />
      )}
    </Container>
  )
}
