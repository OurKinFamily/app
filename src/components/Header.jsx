import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-4 bg-black/60 backdrop-blur border-b border-white/5">
      <Link
        to="/"
        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-center text-[11px] font-bold text-white/70 hover:text-white tracking-wider"
        title="Home"
      >
        OK
      </Link>
    </header>
  )
}
