import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'

// In-flow header for AppShell. `onMenu` shows a hamburger on mobile (top-right).
export function AppHeader({ onMenu }) {
  return (
    <header className="flex h-12 items-center border-b border-white/5 bg-black/60 px-4 backdrop-blur">
      <Link
        to="/"
        title="Home"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold tracking-wider text-white/70 transition-colors hover:bg-white/15 hover:text-white"
      >
        OK
      </Link>
      {onMenu && (
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white md:hidden"
        >
          <Menu size={20} />
        </button>
      )}
    </header>
  )
}
