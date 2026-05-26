import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { AppShell } from './AppShell'
import { AppHeader } from './AppHeader'
import { SidebarNav } from './SidebarNav'
import { BottomBar } from './BottomBar'

// The one app-wide layout. Replaces HomeLayout / ManageLayout / AdminLayout.
// Mobile: bottom bar + hamburger-drawer for the full nav tree.
// Desktop: persistent left sidebar.
export function MainLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = () => setDrawerOpen(false)

  return (
    <>
      <AppShell
        header={<AppHeader onMenu={() => setDrawerOpen(true)} />}
        sidebar={
          <div className="h-full w-56 overflow-y-auto border-r border-white/5 p-3">
            <SidebarNav />
          </div>
        }
        bottomBar={<BottomBar />}
      >
        <Outlet />
      </AppShell>

      {/* mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-[1200] transition-opacity md:hidden',
          drawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setDrawerOpen(false)}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div
          onClick={e => e.stopPropagation()}
          className={cn(
            'absolute right-0 top-0 flex h-full w-[90vw] max-w-sm flex-col overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-2xl transition-transform duration-200',
            drawerOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex shrink-0 items-center justify-end p-3">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6" onClick={closeDrawer}>
            <SidebarNav />
          </div>
        </div>
      </div>
    </>
  )
}
