import { Outlet } from 'react-router-dom'
import { Sidebar, SidebarSection, SidebarLink } from './Sidebar'

export function ManageLayout() {
  return (
    <div className="min-h-screen flex">
      <div className="pt-8 pb-8 pl-4">
        <Sidebar>
          <SidebarSection>Manage</SidebarSection>
          <SidebarLink to="/manage/people">People</SidebarLink>
          <SidebarLink to="/manage/faces">Faces</SidebarLink>
          <SidebarSection>Workers</SidebarSection>
          <SidebarLink to="/manage/jobs">Jobs</SidebarLink>
        </Sidebar>
      </div>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
