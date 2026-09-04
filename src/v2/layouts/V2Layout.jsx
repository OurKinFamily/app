import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Activity, Album, BookOpen, ClipboardList, Images, LayoutDashboard, MapPin, Menu, Notebook, Palette, Play, Search, Sparkles, Star, Trees, Upload, UserCheck, UserPlus, Users, Users2, Wand2 } from 'lucide-react'
import { C } from '../ui/tokens'
import { useMe } from '../../contexts/MeContext'

/**
 * v2 app shell — light, Google Photos in feel.
 *
 * Deliberately shares nothing with MainLayout: its own nav data, its own
 * spacing and colour, so the two can diverge freely while pages migrate.
 *
 * The look leans on a few Google Photos habits: a tall search field as the
 * centre of gravity in the header, a pill-shaped active state in the sidebar,
 * hairline dividers instead of boxes, and a lot of white.
 */

const NAV = [
  {
    items: [
      { to: '/', label: 'Gallery', icon: Images, end: true },
      { to: '/albums', label: 'Albums', icon: Album },
      { to: '/favorites', label: 'Favourites', icon: Star },
    ],
  },
  {
    heading: 'People & places',
    items: [
      { to: '/people', label: 'People', icon: Users },
      { to: '/places', label: 'Places', icon: MapPin },
      { to: '/family', label: 'Family tree', icon: Trees },
      { to: '/biographies', label: 'Biographies', icon: BookOpen },
      { to: '/scrapbook', label: 'Scrapbook', icon: Notebook },
    ],
  },
  {
    // Back-of-house. Family never sees these; they are the work of turning a
    // pile of files into an archive.
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
    heading: 'Design',
    items: [
      { to: '/design/components', label: 'Components', icon: Palette },
    ],
  },
]

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        // Pill sits proud of the rail on the right, flush left — the shape
        // Google Photos uses to imply the sidebar continues off-screen.
        padding: '0 16px 0 22px',
        height: 44,
        borderRadius: '0 24px 24px 0',
        marginRight: 12,
        color: isActive ? C.activeText : C.text,
        background: isActive ? C.activeBg : 'transparent',
        fontWeight: isActive ? 500 : 400,
        fontSize: 14,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function V2Layout() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { viewerPersonId, me } = useMe()
  // Their own initial, not a hard-coded S — this shell is for whoever is
  // signed in, and there is more than one person in this family.
  const initial = (me?.name || me?.email || '?').trim()[0].toUpperCase()
  const [navOpen, setNavOpen] = useState(true)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text,
                  font: '14px/1.5 "Google Sans", Roboto, system-ui, sans-serif' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 8,
          height: 64, padding: '0 16px',
          background: C.bg,
        }}
      >
        <button
          onClick={() => setNavOpen(v => !v)}
          aria-label="Toggle navigation"
          style={{
            display: 'grid', placeItems: 'center',
            width: 48, height: 48, borderRadius: '50%',
            border: 0, background: 'transparent', color: C.text, cursor: 'pointer',
          }}
        >
          <Menu size={22} />
        </button>

        <span style={{ fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em',
                       marginRight: 8, marginLeft: 4 }}>
          ourkin
        </span>

        {/* The search field is the centrepiece, not an afterthought — it's the
            single strongest signal of the Photos look. */}
        <div
          style={{
            flex: 1, maxWidth: 720, marginLeft: 24,
            display: 'flex', alignItems: 'center', gap: 12,
            height: 48, padding: '0 20px',
            background: C.surface, borderRadius: 24,
          }}
        >
          <Search size={20} color={C.muted} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            // Enter goes to the results. Searching as you type would fire a
            // query against 151,000 photographs on every keystroke, and the
            // question here is usually a whole phrase — a name, a place, a
            // year — not a prefix.
            onKeyDown={e => {
              if (e.key !== 'Enter' || !query.trim()) return
              navigate(`/search?q=${encodeURIComponent(query.trim())}`)
            }}
            placeholder="Search your archive"
            style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              fontSize: 16, color: C.text,
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* Adding photographs is something you do from wherever you are, not
            a place you navigate to — so it sits in the header rather than the
            rail, beside the account it belongs to. */}
        <Link
          to="/upload"
          aria-label="Add photographs"
          title="Add photographs"
          style={{
            display: 'grid', placeItems: 'center', width: 40, height: 40,
            borderRadius: '50%', color: C.text, textDecoration: 'none',
          }}
        >
          <Upload size={19} />
        </Link>

        {/* The signed-in person's own page. In a family archive the account
            IS somebody in the archive, so the avatar goes where their photos,
            their family and their story are — not to a preferences panel. */}
        <Link
          to={viewerPersonId ? `/people/${viewerPersonId}` : '/people'}
          aria-label="Your page"
          title="Your page"
          style={{
            width: 32, height: 32, marginLeft: 4, borderRadius: '50%',
            background: '#0b57d0', color: '#fff', textDecoration: 'none',
            display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 500,
          }}
        >
          {initial}
        </Link>
      </header>

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {/* ── Sidebar ──────────────────────────────────────────── */}
        {navOpen && (
          <nav
            style={{
              position: 'sticky', top: 64,
              width: 216, flexShrink: 0,
              height: 'calc(100vh - 64px)', overflowY: 'auto',
              paddingTop: 8, background: C.bg,
            }}
          >
            {NAV.map((group, gi) => (
              <div key={gi} style={{ marginBottom: 8 }}>
                {group.heading && (
                  <>
                    <div style={{ height: 1, background: C.border, margin: '8px 12px 8px 0' }} />
                    <div style={{ padding: '8px 16px 4px 22px', fontSize: 12,
                                  color: C.muted, fontWeight: 500 }}>
                      {group.heading}
                    </div>
                  </>
                )}
                {group.items.map(it => <NavItem key={it.to} {...it} />)}
              </div>
            ))}
          </nav>
        )}

        {/* ── Main ─────────────────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0, padding: '8px 24px 64px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
