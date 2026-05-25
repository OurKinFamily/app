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
      <div className={`transition-all duration-200 overflow-hidden ${collapsed ? 'w-0' : 'w-36'}`}>
        <nav className="px-2 space-y-0.5">
          {children}
        </nav>
      </div>
      <button
        onClick={toggle}
        className="self-start mt-0.5 p-1 text-white/25 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors text-2xl leading-none"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </div>
  )
}

export function SidebarBack({ to, children }) {
  return (
    <NavLink
      to={to}
      className="flex items-center gap-1.5 px-3 py-2 mb-2 text-[12px] text-white/25 hover:text-white/60 transition-colors rounded-lg hover:bg-white/5"
    >
      <span>←</span>
      <span>{children}</span>
    </NavLink>
  )
}

export function SidebarSection({ children }) {
  return (
    <p className="px-2 py-0.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider mt-3 first:mt-0">
      {children}
    </p>
  )
}

export function SidebarLink({ to, children, indent = false, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-1.5 py-1 rounded-md text-[13px] transition-colors ${indent ? 'pl-5 pr-2' : 'px-2 py-1'} ${
          isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
        }`
      }
    >
      {icon && <span className="flex-shrink-0 opacity-70">{icon}</span>}
      {children}
    </NavLink>
  )
}
