import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'

// In-flow header for AppShell. `onMenu` shows a hamburger on mobile (top-left).
export function AppHeader({ onMenu }) {
  const [me, setMe] = useState(null)

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => r.ok ? r.json() : null)
      .then(setMe)
      .catch(() => {})
  }, [])

  const userName = me?.person?.known_as || me?.person?.name?.split(' ')[0] || null
  const userTo   = me?.person?.id ? `/manage/people/${me.person.id}` : null

  return (
    <header className="flex h-12 items-center gap-2 border-b border-white/5 bg-black/60 pl-2 pr-4 backdrop-blur">
      {onMenu && (
        <button
          onClick={onMenu}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Menu size={20} />
        </button>
      )}
      <Link
        to="/"
        title="Home"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold tracking-wider text-white/70 transition-colors hover:bg-white/15 hover:text-white"
      >
        OK
      </Link>
      {userName && (
        userTo
          ? <Link to={userTo} className="relative z-10 truncate text-[13px] text-white/70 transition-colors hover:text-white" title={me?.person?.name || ''}>{userName}</Link>
          : <span className="truncate text-[13px] text-white/70">{userName}</span>
      )}
      {/* Trailing slot — pages portal icon buttons in here (filters, etc.). */}
      <div id="layout-header-trailing" className="ml-auto flex items-center gap-1" />
    </header>
  )
}
