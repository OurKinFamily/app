import { Outlet } from 'react-router-dom'
import { Images, Settings2, Shield } from 'lucide-react'
import { Sidebar, SidebarSection, SidebarLink } from './Sidebar'

export function HomeLayout() {
  return (
    <div className="min-h-screen flex">
      <div className="sticky top-12 self-start h-[calc(100vh-3rem)] pt-8 pb-8 pl-4 overflow-y-auto">
        <Sidebar>
          <SidebarSection>Our Kin</SidebarSection>
          <SidebarLink to="/gallery" icon={<Images size={14} />}>Gallery</SidebarLink>
          <SidebarLink to="/gallery/media" indent>Media</SidebarLink>
          <SidebarLink to="/gallery/places" indent>Places</SidebarLink>
          <SidebarLink to="/gallery/people" indent>People</SidebarLink>
          <SidebarLink to="/gallery/scrapbook" indent>Scrapbook</SidebarLink>
          <SidebarSection>Library</SidebarSection>
          <SidebarLink to="/manage/people" icon={<Settings2 size={14} />}>Manage</SidebarLink>
          <SidebarLink to="/admin/jobs" icon={<Shield size={14} />}>Admin</SidebarLink>
        </Sidebar>
      </div>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
