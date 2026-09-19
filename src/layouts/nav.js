import {
  Activity, Album, BookOpen, ClipboardList, Images, LayoutDashboard, MapPin,
  Notebook, Palette, Play, Sparkles, Star, Trees, UserCheck, UserPlus, Users,
  Users2, Wand2,
} from 'lucide-react'

/**
 * The rail.
 *
 * `needs` says who a group is for, matching the route guards: 'gallery' is the
 * owner and Cayce, 'admin' is the back of house. A family member signing in
 * sees the people and what has been written about them — not a rail of links
 * that bounce them somewhere else, which reads as a broken app rather than as
 * one that was never theirs to use.
 */
export const NAV = [
  {
    items: [
      { to: '/', label: 'Gallery', icon: Images, end: true, needs: 'gallery' },
      { to: '/albums', label: 'Albums', icon: Album },
      { to: '/favorites', label: 'Favourites', icon: Star },
    ],
  },
  {
    heading: 'People & places',
    items: [
      { to: '/people', label: 'People', icon: Users },
      { to: '/places', label: 'Places', icon: MapPin, needs: 'gallery' },
      { to: '/family', label: 'Family tree', icon: Trees },
      { to: '/biographies', label: 'Biographies', icon: BookOpen },
      { to: '/scrapbook', label: 'Scrapbook', icon: Notebook },
    ],
  },
  {
    // Back-of-house. Family never sees these; they are the work of turning a
    // pile of files into an archive.
    needs: 'admin',
    heading: 'Manage',
    items: [
      { to: '/faces/suggestions', label: 'Face suggestions', icon: Wand2 },
      { to: '/faces/unassigned', label: 'Unassigned faces', icon: UserPlus },
      { to: '/faces/assigned', label: 'Assigned faces', icon: UserCheck },
      { to: '/groups', label: 'Groups', icon: Users2 },
      { to: '/suggestions', label: 'Suggestions', icon: Sparkles },
    ],
  },
  {
    needs: 'admin',
    heading: 'Admin',
    items: [
      { to: '/admin/analytics', label: 'Analytics', icon: LayoutDashboard },
      { to: '/admin/health', label: 'Health', icon: Activity },
      // The deep one: what every processor has and has not touched, per
      // directory. Only as current as the last Archive Report run, which is
      // why it sits next to Jobs.
      { to: '/admin/overview', label: 'Archive report', icon: ClipboardList },
      { to: '/admin/jobs', label: 'Jobs', icon: Play },
      { to: '/admin/mosaic', label: 'Mosaic', icon: Palette },
    ],
  },
  {
    // Bottom of the rail: the style guide is for us, not for family.
    needs: 'admin',
    heading: 'Design',
    items: [
      { to: '/design/components', label: 'Components', icon: Palette },
    ],
  },
]
