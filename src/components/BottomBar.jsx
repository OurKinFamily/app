import { NavLink } from 'react-router-dom'
import { Images, Users, MapPin, TreeDeciduous, Settings2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { useMe } from '../contexts/MeContext'

const PUBLIC_ITEMS = [
  { to: '/gallery', label: 'Gallery', Icon: Images, end: true, galleryOnly: true },
  { to: '/gallery/people', label: 'People', Icon: Users },
  { to: '/gallery/places', label: 'Places', Icon: MapPin, galleryOnly: true },
  { to: '/gallery/family', label: 'Family', Icon: TreeDeciduous },
]
const ADMIN_ITEMS = [
  { to: '/manage', label: 'Manage', Icon: Settings2 },
]

export function BottomBar() {
  const { isAdmin, me } = useMe()
  const canGallery = me?.can_see_gallery ?? false
  const ITEMS = [
    ...PUBLIC_ITEMS.filter(it => canGallery || !it.galleryOnly),
    ...(isAdmin ? ADMIN_ITEMS : []),
  ]
  return (
    <nav className="flex items-stretch gap-1 overflow-x-auto border-t border-white/10 bg-black/80 px-2 py-1.5 backdrop-blur">
      {ITEMS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] transition-colors',
              isActive ? 'text-white' : 'text-white/45 hover:text-white/70',
            )
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
