import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PersonHero } from '../ui/PersonHero'
import { LoadingDots } from '../ui/LoadingDots'
import { AvatarPicker } from '../../components/AvatarPicker'
import { CoverPicker } from '../../components/CoverPicker'
import { getPerson, getPhotos, getRelatives } from '../../lib/api'
import { useIsAdmin } from '../../contexts/MeContext'
import { C } from '../ui/tokens'

/**
 * One person: the shell the tabs hang from.
 *
 * It hands its tabs exactly the outlet context v1's page did — person,
 * setPerson, relatives, reloadRelatives, editing, setEditing — which is what
 * lets all eight work here from the first day, reskinned or not. Ported tabs
 * come out of the legacy panel one at a time without this file changing.
 */

const TABS = [
  { to: 'overview', label: 'Overview' },
  { to: 'biography', label: 'Biography' },
  { to: 'circles', label: 'Circles' },
  { to: 'timeline', label: 'Timeline' },
  { to: 'ancestry', label: 'Ancestry' },
  { to: 'scrapbook', label: 'Scrapbook' },
  { to: 'travel', label: 'Travel' },
]

export function V2PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [person, setPerson] = useState(null)
  const [relatives, setRelatives] = useState(null)
  const [hero, setHero] = useState(null)
  const [editing, setEditing] = useState(false)
  const [avatarPicker, setAvatarPicker] = useState(false)
  const [coverPicker, setCoverPicker] = useState(false)

  const reloadRelatives = useCallback(() => {
    getRelatives(id).then(setRelatives).catch(() => {})
  }, [id])

  useEffect(() => {
    let alive = true
    getPerson(id)
      .then(p => { if (alive) setPerson(p) })
      .catch(() => navigate('/people'))
    getRelatives(id)
      .then(r => { if (alive) setRelatives(r) })
      .catch(() => {})
    return () => { alive = false }
  }, [id, navigate])

  // No cover set: borrow one of their photographs, which is better than a grey
  // rectangle on a page that is meant to be about a person.
  useEffect(() => {
    if (!person) return
    let alive = true
    if (person.cover_image) {
      // Deferred rather than set outright: assigning state straight from an
      // effect body starts another render before this one has painted.
      queueMicrotask(() => { if (alive) setHero(person.cover_image) })
      return () => { alive = false }
    }
    getPhotos(id, 100, 0)
      .then(d => {
        if (!alive) return
        const images = (d?.paths || []).filter(p => /\.(jpe?g|png|heic|heif|webp)$/i.test(p))
        setHero(images.length ? images[Math.floor(Math.random() * images.length)] : null)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [id, person])

  if (!person) return <LoadingDots />

  return (
    <div>
      <button type="button" onClick={() => navigate('/people')} style={backButton}>
        <ArrowLeft size={15} /> People
      </button>

      <PersonHero
        person={person}
        hero={hero}
        isAdmin={isAdmin}
        onPickAvatar={() => setAvatarPicker(true)}
        onPickCover={() => setCoverPicker(true)}
      />

      <nav
        className="hide-scrollbar"
        style={{
          display: 'flex', gap: 2, marginBottom: 18,
          borderBottom: `1px solid ${C.border}`, overflowX: 'auto',
        }}
      >
        {TABS.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            style={({ isActive }) => ({
              padding: '8px 14px', fontSize: 13.5, textDecoration: 'none',
              whiteSpace: 'nowrap',
              color: isActive ? C.activeText : C.muted,
              borderBottom: `2px solid ${isActive ? C.activeText : 'transparent'}`,
              marginBottom: -1,
            })}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ person, setPerson, relatives, reloadRelatives, editing, setEditing }} />

      {isAdmin && avatarPicker && (
        <AvatarPicker
          person={person}
          onClose={() => setAvatarPicker(false)}
          onSaved={crop => setPerson(p => ({ ...p, avatar: crop }))}
        />
      )}
      {isAdmin && coverPicker && (
        <CoverPicker
          person={person}
          onClose={() => setCoverPicker(false)}
          onSaved={patch => setPerson(p => ({ ...p, ...patch }))}
        />
      )}
    </div>
  )
}

const backButton = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: 0, background: 'transparent', color: C.muted,
  fontSize: 13, cursor: 'pointer', padding: '4px 0', margin: '4px 0 8px',
}
