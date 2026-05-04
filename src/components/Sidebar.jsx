import { useState } from 'react'
import { NavLink } from 'react-router-dom'

export function Sidebar({ children }) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  )

  const toggle = () => setCollapsed(prev => {
    const next = !prev
    localStorage.setItem('sidebar-collapsed', String(next))
    return next
  })

  return (
    <div className="flex shrink-0">
      <div className={`transition-all duration-200 overflow-hidden ${collapsed ? 'w-0' : 'w-44'}`}>
        <nav className="px-4 space-y-1">
          {children}
        </nav>
      </div>
      <button
        onClick={toggle}
        className="self-start mt-0.5 p-1.5 text-white/25 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors text-base leading-none"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </div>
  )
}

export function SidebarSection({ children }) {
  return (
    <p className="px-3 py-1 text-xs font-semibold text-white/25 uppercase tracking-wider mt-4 first:mt-0">
      {children}
    </p>
  )
}

export function SidebarLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
