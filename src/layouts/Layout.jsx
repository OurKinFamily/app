import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, Search, Upload } from 'lucide-react'
import { C } from '../ui/tokens'
import { useMe } from '../contexts/MeContext'
import { useIsWide } from '../lib/useIsWide'
import { NAV } from './nav'

/**
 * v2 app shell — light, Google Photos in feel.
 *
 * The only shell now. It was written to share nothing with the one it
 * replaced, so the two could diverge freely while pages moved across one at a
 * time; that one is gone and this is what the app looks like.
 *
 * The look leans on a few Google Photos habits: a tall search field as the
 * centre of gravity in the header, a pill-shaped active state in the sidebar,
 * hairline dividers instead of boxes, and a lot of white.
 */

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

export function Layout() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { viewerPersonId, me, isAdmin, canEditMedia } = useMe()
  // What this person is allowed to reach, so the rail shows only that. It
  // mirrors the route guards rather than reimplementing them: anything hidden
  // here would have bounced them anyway.
  const canSeeGallery = !!me?.can_see_gallery
  const allowed = need => (
    need === 'admin' ? isAdmin
      : need === 'gallery' ? canSeeGallery
        // Writing to the archive at all. False on the deployed containers,
        // where /photos is mounted read-only.
        : need === 'edit' ? canSeeGallery && canEditMedia
          : true
  )
  const visibleNav = NAV
    .filter(group => allowed(group.needs))
    .map(group => ({ ...group, items: group.items.filter(item => allowed(item.needs)) }))
    .filter(group => group.items.length > 0)
  // Their own initial, not a hard-coded S — this shell is for whoever is
  // signed in, and there is more than one person in this family.
  const initial = (me?.name || me?.email || '?').trim()[0].toUpperCase()
  // Wide enough for the rail to sit beside the photographs rather than on top
  // of them. Below it the rail is a drawer: 216px out of a phone's width left
  // the gallery a column so narrow that a date heading wrapped onto four lines.
  const wide = useIsWide()
  const [navOpen, setNavOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 900,
  )

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

        {/* The search field is the centrepiece on a desktop — the single
            strongest signal of the Photos look. On a phone it is a button:
            at full width it pushed the upload and account controls off the
            edge, and a 48px-tall field for a question you ask once a session
            is a poor trade for the whole header. */}
        {!wide && (
          <Link
            to="/search"
            aria-label="Search your archive"
            title="Search your archive"
            style={{
              display: 'grid', placeItems: 'center', width: 44, height: 44,
              marginLeft: 'auto', borderRadius: '50%',
              color: C.text, textDecoration: 'none',
            }}
          >
            <Search size={22} />
          </Link>
        )}

        {wide && (
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
        )}

        {wide && <div style={{ flex: 1 }} />}

        {/* Adding photographs is something you do from wherever you are, not
            a place you navigate to — so it sits in the header rather than the
            rail, beside the account it belongs to. */}
        {/* Only for whoever can add to the archive. An upload button that
            bounces a family member somewhere else reads as a broken app
            rather than as one that was never theirs to add to. */}
        {canSeeGallery && canEditMedia && (
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
        )}

        {/* The signed-in person's own page. In a family archive the account
            IS somebody in the archive, so the avatar goes where their photos,
            their family and their story are — not to a preferences panel.

            Held back until we know who they are. It used to fall back to the
            People list in the meantime, which meant a click landing in the
            first half-second went somewhere that was not "your page" at all. */}
        {viewerPersonId && (
          <Link
            to={`/people/${viewerPersonId}`}
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
        )}
      </header>

      {/* Fills whatever is left below the header. Without a minimum the row
          is only as tall as its content, and a page with four albums on it
          left the ground showing underneath. */}
      <div style={{ display: 'flex', alignItems: 'flex-start',
                    minHeight: 'calc(100vh - 64px)' }}>
        {/* ── Sidebar ──────────────────────────────────────────── */}
        {/* Over the content on a phone, beside it on a desktop. Tapping a
            scrim is how every drawer on a phone closes, so it closes that way
            too. */}
        {navOpen && !wide && (
          <div
            onClick={() => setNavOpen(false)}
            style={{
              position: 'fixed', inset: '64px 0 0 0', zIndex: 15,
              background: 'rgba(32,33,36,.4)',
            }}
          />
        )}
        {navOpen && (
          <nav
            style={wide ? {
              position: 'sticky', top: 64,
              width: 216, flexShrink: 0,
              height: 'calc(100vh - 64px)', overflowY: 'auto',
              paddingTop: 8, background: C.bg,
            } : {
              position: 'fixed', top: 64, left: 0, zIndex: 16,
              width: 264, height: 'calc(100vh - 64px)', overflowY: 'auto',
              paddingTop: 8, background: C.bg,
              boxShadow: '2px 0 16px rgba(0,0,0,.18)',
            }}
            onClick={() => { if (!wide) setNavOpen(false) }}
          >
            {visibleNav.map((group, gi) => (
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
