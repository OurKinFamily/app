import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Images, MapPin, Users, Album, Heart, TreeDeciduous,
  UserPlus, UserCheck, CheckCircle, Users2, Sparkles,
  LayoutDashboard, Activity, Palette, Search, Wand2,
} from 'lucide-react'
import { cn } from '../lib/cn'

// Admin + Tools are Stephen-only views — Cayce and other family viewers
// don't see them. Gate is intentionally simple: match the email on the
// /me response. Anything else gets the public Our Kin / Manage groups.
const ADMIN_EMAILS = new Set(['stephenyoung7267@gmail.com'])

const SECTIONS = [
  {
    title: 'Our Kin',
    items: [
      { to: '/search', label: 'Search', Icon: Search },
      { to: '/gallery', label: 'Gallery', Icon: Images, end: true },
      { to: '/gallery/places', label: 'Places', Icon: MapPin },
      { to: '/gallery/people', label: 'People', Icon: Users },
      { to: '/gallery/albums', label: 'Albums', Icon: Album },
      { to: '/gallery/favorites', label: 'Favorites', Icon: Heart },
      { to: '/gallery/family', label: 'Family', Icon: TreeDeciduous },
    ],
  },
  {
    title: 'Manage',
    items: [
      { to: '/manage/faces/suggestions', label: 'Face suggestions', Icon: Wand2 },
      { to: '/manage/faces/unassigned', label: 'Unassigned faces', Icon: UserPlus },
      { to: '/manage/faces/assigned', label: 'Assigned faces', Icon: UserCheck },
      { to: '/manage/faces/confirm', label: 'Confirm faces', Icon: CheckCircle },
      { to: '/manage/groups', label: 'Groups', Icon: Users2 },
      { to: '/manage/suggestions', label: 'Suggestions', Icon: Sparkles },
    ],
  },
  {
    title: 'Admin',
    items: [
      { to: '/admin/overview', label: 'Overview (legacy)', Icon: LayoutDashboard },
      { to: '/admin/filesystem', label: 'Analytics', Icon: LayoutDashboard },
      { to: '/admin/health', label: 'Health', Icon: Activity },
      { to: '/admin/mosaic', label: 'Mosaic', Icon: Palette },
      { to: '/admin/jobs', label: 'Jobs', Icon: Activity },
    ],
  },
  {
    title: 'Tools',
    items: [
      { to: '/design', label: 'Design', Icon: Palette },
    ],
  },
]

export function SidebarNav() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => (r.ok ? r.json() : null))
      .then(me => setIsAdmin(ADMIN_EMAILS.has(me?.email)))
      .catch(() => {})
  }, [])

  const visible = SECTIONS.filter(s => isAdmin || (s.title !== 'Admin' && s.title !== 'Tools'))

  return (
    <nav className="flex flex-col gap-5">
      {visible.map(section => (
        <div key={section.title}>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">{section.title}</p>
          <ul className="space-y-0.5">
            {section.items.map(({ to, label, Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors',
                      isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white/90',
                    )
                  }
                >
                  {Icon && <Icon size={16} className="shrink-0 opacity-80" />}
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
