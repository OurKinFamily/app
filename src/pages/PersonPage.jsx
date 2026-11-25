import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PersonHero } from '../ui/PersonHero'
import { LoadingDots } from '../ui/LoadingDots'
import { AvatarPicker } from '../components/AvatarPicker'
import { getPerson, getPhotos, getRelatives } from '../lib/api'
import { useIsAdmin } from '../contexts/MeContext'
import { C } from '../ui/tokens'

/**
 * One person: the shell the tabs hang from.
 *
 * It hands its tabs exactly the outlet context v1's page did — person,
 * setPerson, relatives, reloadRelatives, editing, setEditing — which is what
 * lets all eight work here from the first day, reskinned or not. Ported tabs
 * come out of the legacy panel one at a time without this file changing.
 *
 * The hero renders here rather than in any tab, so moving between tabs swaps
 * only what is below it. The mosaic it draws is keyed on the person id alone:
 * a tab editing a fact calls setPerson, and if that were a dependency the
 * photographs would be refetched and the hero would visibly reshuffle.
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

const IMAGE = /\.(jpe?g|png|heic|heif|webp)$/i

export function PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [person, setPerson] = useState(null)
  const [relatives, setRelatives] = useState(null)
  const [photoSet, setPhotoSet] = useState({ forId: null, paths: [] })
  const [editing, setEditing] = useState(false)
  const [avatarPicker, setAvatarPicker] = useState(false)

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

  // The hero mosaic. Fetched once per person — never on a tab change, and
  // never when a tab saves an edit.
  useEffect(() => {
    let alive = true
    getPhotos(id, 100, 0)
      .then(d => {
        if (!alive) return
        setPhotoSet({ forId: id, paths: (d?.paths || []).filter(p => IMAGE.test(p)) })
      })
      .catch(() => {})
    return () => { alive = false }
  }, [id])

  if (!person) return <LoadingDots />

  return (
    <div>
      <button type="button" onClick={() => navigate('/people')} style={backButton}>
        <ArrowLeft size={15} /> People
      </button>

      <PersonHero
        person={person}
        photos={photoSet.forId === id ? photoSet.paths : []}
        isAdmin={isAdmin}
        onPickAvatar={() => setAvatarPicker(true)}
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
    </div>
  )
}

const backButton = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: 0, background: 'transparent', color: C.muted,
  fontSize: 13, cursor: 'pointer', padding: '4px 0', margin: '4px 0 8px',
}
