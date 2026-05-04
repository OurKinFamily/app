import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link, Outlet } from 'react-router-dom'
import { getPerson, getRelatives } from '../lib/api'
import { Sidebar, SidebarLink } from '../components/Sidebar'
import { AvatarPicker } from '../components/AvatarPicker'

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [person, setPerson] = useState(null)
  const [relatives, setRelatives] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const reloadRelatives = useCallback(() => {
    getRelatives(id).then(setRelatives)
  }, [id])

  useEffect(() => {
    setPerson(null)
    setRelatives(null)
    getPerson(id).then(setPerson).catch(() => navigate('/manage/people'))
    getRelatives(id).then(setRelatives)
  }, [id])

  if (!person) return <div className="min-h-screen p-8 text-white/40">Loading…</div>

  const handleAvatarSaved = (cropPath) => {
    setPerson(p => ({ ...p, avatar: cropPath }))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-8 pb-0">
        <Link to="/manage/people" className="text-white/40 text-sm hover:text-white/70 inline-block mb-6">
          ← People
        </Link>
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="relative group w-16 h-16 shrink-0 cursor-pointer"
            onClick={() => setPickerOpen(true)}
          >
            {person.avatar ? (
              <img
                src={`/api/media/${person.avatar}`}
                alt=""
                className="w-16 h-16 rounded-full object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-lg font-medium ring-2 ring-white/10">
                {initials(person.name)}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
              </svg>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-semibold text-white">{person.name}</h1>
            {person.known_as && person.known_as !== person.name && (
              <p className="text-white/50 mt-1">Known as "{person.known_as}"</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 mt-6">
        <Sidebar>
          <SidebarLink to="overview">Overview</SidebarLink>
          <SidebarLink to="ancestry">Ancestry</SidebarLink>
          <SidebarLink to="gallery">Gallery</SidebarLink>
          <SidebarLink to="scrapbook">Scrapbook</SidebarLink>
          <SidebarLink to="travel">Travel</SidebarLink>
          <SidebarLink to="ai">AI</SidebarLink>
        </Sidebar>

        <main className="flex-1 px-8 pb-8">
          <Outlet context={{ person, relatives, reloadRelatives }} />
        </main>
      </div>

      {pickerOpen && (
        <AvatarPicker
          person={person}
          onClose={() => setPickerOpen(false)}
          onSaved={handleAvatarSaved}
        />
      )}
    </div>
  )
}
