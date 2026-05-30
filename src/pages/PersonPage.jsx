import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Outlet, NavLink } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { getPerson, getRelatives, getPhotos } from '../lib/api'
import { mediaUrl, mediumUrl } from '../lib/media'
import { cn } from '../lib/cn'
import { Container } from '../components/Container'
import { Avatar } from '../components/Avatar'
import { AvatarPicker } from '../components/AvatarPicker'
import { CoverPicker } from '../components/CoverPicker'

function formatDate(date, precision) {
  if (!date) return null
  if (precision === 'year') return date.slice(0, 4)
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const TABS = [
  { to: 'overview', label: 'Overview' },
  { to: 'circles', label: 'Circles' },
  { to: 'timeline', label: 'Timeline' },
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
  const [hero, setHero] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [coverPickerOpen, setCoverPickerOpen] = useState(false)
  const [editing, setEditing] = useState(false)

  const reloadRelatives = useCallback(() => { getRelatives(id).then(setRelatives) }, [id])

  useEffect(() => {
    setPerson(null)
    setRelatives(null)
    setHero(null)
    getPerson(id).then(setPerson).catch(() => navigate('/gallery/people'))
    getRelatives(id).then(setRelatives).catch(() => {})
  }, [id])

  // Reflect cover_image changes (initial load, picker save, lightbox "set as
  // cover") into the hero state. Falls back to a random still image when no
  // cover is set.
  useEffect(() => {
    if (!person) return
    if (person.cover_image) {
      setHero(person.cover_image)
      return
    }
    getPhotos(id, 100, 0).then(d => {
      const imgs = (d?.paths || []).filter(x => /\.(jpe?g|png|heic|heif|webp)$/i.test(x))
      if (imgs.length) setHero(imgs[Math.floor(Math.random() * imgs.length)])
      else setHero(null)
    }).catch(() => {})
  }, [id, person?.cover_image])

  if (!person) return <div className="p-8 text-white/40">Loading…</div>

  return (
    <>
      {/* Full-bleed hero — sits outside Container so the photo spans edge-to-edge */}
      <div
        className="group/hero relative h-[300px] overflow-hidden bg-cover"
        style={hero ? {
          backgroundImage: `url(${mediumUrl(hero)})`,
          backgroundPosition: person.cover_position || 'center',
        } : undefined}
      >
        {hero && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />}
        <button
          onClick={() => setCoverPickerOpen(true)}
          aria-label="Change cover photo"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-black/40 text-white/80 opacity-0 transition-opacity hover:bg-black/60 hover:text-white group-hover/hero:opacity-100"
        >
          <Pencil size={16} />
        </button>
        <Container className="relative flex h-full items-end pb-4">
          <div className="flex w-full items-end gap-4">
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
              <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl font-semibold text-white">
                <span>{person.known_as || person.name}</span>
                <button
                  onClick={() => setEditing(v => !v)}
                  aria-label={editing ? 'Cancel edit' : 'Edit person'}
                  className="text-white/60 transition-colors hover:text-white"
                >
                  <Pencil size={16} />
                </button>
              </h1>
              {person.known_as && person.known_as !== person.name && (
                <p className="mt-0.5 text-[14px] text-white/60">{person.name}</p>
              )}
              {(person.birth_date || person.birth_place) && (
                <p className="mt-0.5 text-[13px] text-white/60">
                  {person.birth_date && <>Born {formatDate(person.birth_date, person.birth_date_precision)}</>}
                  {person.birth_date && person.birth_place && ' · '}
                  {person.birth_place}
                </p>
              )}
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-6">
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
      {coverPickerOpen && (
        <CoverPicker
          person={person}
          onClose={() => setCoverPickerOpen(false)}
          onSaved={({ cover_image, cover_position }) => {
            setPerson(p => ({ ...p, cover_image, cover_position }))
            if (cover_image) setHero(cover_image)
            else {
              // Cleared — fall back to a fresh random photo.
              getPhotos(id, 100, 0).then(d => {
                const imgs = (d?.paths || []).filter(x => /\.(jpe?g|png|heic|heif|webp)$/i.test(x))
                if (imgs.length) setHero(imgs[Math.floor(Math.random() * imgs.length)])
                else setHero(null)
              })
            }
          }}
        />
      )}
      </Container>
    </>
  )
}
