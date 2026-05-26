import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar, SidebarBack, SidebarSection, SidebarLink } from './Sidebar'

export function ManageLayout() {
  const [suggCount, setSuggCount] = useState(0)

  useEffect(() => {
    fetch('/api/suggestions/count')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setSuggCount(d.count))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex">
      <div className="sticky top-12 self-start h-[calc(100vh-3rem)] pt-8 pb-8 pl-4 overflow-y-auto">
        <Sidebar>
          <SidebarBack to="/">Home</SidebarBack>
          <SidebarSection>Manage</SidebarSection>
          <SidebarLink to="/manage/faces/unassigned">Faces</SidebarLink>
          <SidebarLink to="/manage/faces/unassigned" indent>Unassigned</SidebarLink>
          <SidebarLink to="/manage/faces/assigned" indent>Assigned</SidebarLink>
          <SidebarLink to="/manage/groups">Groups</SidebarLink>
          <SidebarLink to="/manage/suggestions">
            <span className="flex items-center gap-2">
              Suggestions
              {suggCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium leading-none">
                  {suggCount}
                </span>
              )}
            </span>
          </SidebarLink>
        </Sidebar>
      </div>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
