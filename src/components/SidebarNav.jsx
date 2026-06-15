import { NavLink } from 'react-router-dom'
import {
  Images, MapPin, Users, Album, Heart, TreeDeciduous,
  UserPlus, UserCheck, Users2, Sparkles, BookText,
  LayoutDashboard, Activity, Palette, Search, Wand2,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useMe } from '../contexts/MeContext'

const SECTIONS = [
  {
    title: 'Our Kin',
    items: [
      { to: '/search', label: 'Search', Icon: Search, adminOnly: true },
      { to: '/gallery', label: 'Gallery', Icon: Images, end: true, galleryOnly: true },
      { to: '/gallery/places', label: 'Places', Icon: MapPin, galleryOnly: true },
      { to: '/gallery/people', label: 'People', Icon: Users },
      { to: '/gallery/biographies', label: 'Biographies', Icon: BookText },
      { to: '/gallery/albums', label: 'Albums', Icon: Album, adminOnly: true },
      { to: '/gallery/favorites', label: 'Favorites', Icon: Heart, adminOnly: true },
      { to: '/gallery/family', label: 'Family', Icon: TreeDeciduous },
    ],
  },
  {
    title: 'Manage',
    adminOnly: true,
    items: [
      { to: '/manage/faces/suggestions', label: 'Face suggestions', Icon: Wand2 },
      { to: '/manage/faces/unassigned', label: 'Unassigned faces', Icon: UserPlus },
      { to: '/manage/faces/assigned', label: 'Assigned faces', Icon: UserCheck },
      { to: '/manage/groups', label: 'Groups', Icon: Users2 },
      { to: '/manage/suggestions', label: 'Suggestions', Icon: Sparkles },
    ],
  },
  {
    title: 'Admin',
    adminOnly: true,
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
    adminOnly: true,
    items: [
      { to: '/design', label: 'Design', Icon: Palette },
    ],
  },
]

export function SidebarNav() {
  const { isAdmin, me } = useMe()
  const canGallery = me?.can_see_gallery ?? false
  const visible = SECTIONS.filter(s => isAdmin || !s.adminOnly)
  const itemVisible = it => (isAdmin || !it.adminOnly) && (canGallery || !it.galleryOnly)

  return (
    <nav className="flex flex-col gap-5">
      {visible.map(section => (
        <div key={section.title}>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">{section.title}</p>
          <ul className="space-y-0.5">
            {section.items.filter(itemVisible).map(({ to, label, Icon, end }) => (
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
