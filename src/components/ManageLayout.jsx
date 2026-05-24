import { Outlet } from 'react-router-dom'
import { Sidebar, SidebarBack, SidebarSection, SidebarLink } from './Sidebar'

export function ManageLayout() {
  return (
    <div className="min-h-screen flex">
      <div className="sticky top-12 self-start h-[calc(100vh-3rem)] pt-8 pb-8 pl-4 overflow-y-auto">
        <Sidebar>
          <SidebarBack to="/">Home</SidebarBack>
          <SidebarSection>Manage</SidebarSection>
          <SidebarLink to="/manage/people">People</SidebarLink>
          <SidebarLink to="/manage/faces">Faces</SidebarLink>
        </Sidebar>
      </div>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
