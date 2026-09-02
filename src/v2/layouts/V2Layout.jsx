import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Menu, Search, Images, Users, MapPin, BookOpen, Star,
  Album, Trees, Upload, Settings, Palette,
} from 'lucide-react'
import { C } from '../ui/tokens'

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
      { to: '/v2', label: 'Gallery', icon: Images, end: true },
      { to: '/v2/albums', label: 'Albums', icon: Album },
      { to: '/v2/favorites', label: 'Favourites', icon: Star },
    ],
  },
  {
    heading: 'People & places',
    items: [
      { to: '/v2/people', label: 'People', icon: Users },
      { to: '/v2/places', label: 'Places', icon: MapPin },
      { to: '/v2/family', label: 'Family tree', icon: Trees },
    ],
  },
  {
    heading: 'Library',
    items: [
      { to: '/v2/biographies', label: 'Biographies', icon: BookOpen },
      { to: '/v2/upload', label: 'Upload', icon: Upload },
    ],
  },
  {
    // Bottom of the rail: the style guide is for us, not for family.
    heading: 'Design',
    items: [
      { to: '/v2/design/components', label: 'Components', icon: Palette },
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
            border: 0, background: 'transparent', color: C.muted, cursor: 'pointer',
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
            placeholder="Search your archive"
            style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              fontSize: 16, color: C.text,
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        <button
          aria-label="Settings"
          style={{
            display: 'grid', placeItems: 'center', width: 48, height: 48,
            borderRadius: '50%', border: 0, background: 'transparent',
            color: C.muted, cursor: 'pointer',
          }}
        >
          <Settings size={20} />
        </button>
        <div
          aria-label="Account"
          style={{
            width: 32, height: 32, marginLeft: 8, borderRadius: '50%',
            background: '#0b57d0', color: '#fff',
            display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 500,
          }}
        >
          S
        </div>
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
