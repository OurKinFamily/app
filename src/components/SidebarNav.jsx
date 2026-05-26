import { NavLink } from 'react-router-dom'
import {
  Images, MapPin, Users, BookOpen, Album, Heart,
  UserPlus, UserCheck, Users2, Sparkles,
  LayoutDashboard, Activity, Palette,
} from 'lucide-react'
import { cn } from '../lib/cn'

const SECTIONS = [
  {
    title: 'Our Kin',
    items: [
      { to: '/gallery', label: 'Gallery', Icon: Images, end: true },
      { to: '/gallery/places', label: 'Places', Icon: MapPin },
      { to: '/gallery/people', label: 'People', Icon: Users },
      { to: '/gallery/scrapbook', label: 'Scrapbook', Icon: BookOpen },
      { to: '/gallery/albums', label: 'Albums', Icon: Album },
      { to: '/gallery/favorites', label: 'Favorites', Icon: Heart },
    ],
  },
  {
    title: 'Manage',
    items: [
      { to: '/manage/faces/unassigned', label: 'Unassigned faces', Icon: UserPlus },
      { to: '/manage/faces/assigned', label: 'Assigned faces', Icon: UserCheck },
      { to: '/manage/groups', label: 'Groups', Icon: Users2 },
      { to: '/manage/suggestions', label: 'Suggestions', Icon: Sparkles },
    ],
  },
  {
    title: 'Admin',
    items: [
      { to: '/admin/overview', label: 'Overview', Icon: LayoutDashboard },
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
  return (
    <nav className="flex flex-col gap-5">
      {SECTIONS.map(section => (
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
