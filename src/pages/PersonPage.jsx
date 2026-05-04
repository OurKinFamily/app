import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link, Outlet } from 'react-router-dom'
import { getPerson, getRelatives } from '../lib/api'
import { Sidebar, SidebarLink } from '../components/Sidebar'

export function PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [person, setPerson] = useState(null)
  const [relatives, setRelatives] = useState(null)

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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-8 pb-0">
        <Link to="/manage/people" className="text-white/40 text-sm hover:text-white/70 inline-block mb-6">
          ← People
        </Link>
        <h1 className="text-3xl font-semibold text-white">{person.name}</h1>
        {person.known_as && person.known_as !== person.name && (
          <p className="text-white/50 mt-1">Known as "{person.known_as}"</p>
        )}
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
    </div>
  )
}
