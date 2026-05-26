import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { AppShell } from './AppShell'
import { AppHeader } from './AppHeader'
import { SidebarNav } from './SidebarNav'
import { BottomBar } from './BottomBar'
import { ScrollTopButton } from './ScrollTopButton'

// The one app-wide layout. Replaces HomeLayout / ManageLayout / AdminLayout.
// Mobile: bottom bar + hamburger-drawer for the full nav tree.
// Desktop: persistent left sidebar.
//
// The sticky header is AppHeader + a #layout-subheader portal slot. Pages can
// inject a sub-bar (filters, page tabs) via SubheaderPortal. ResizeObserver
// publishes the combined header height as `--app-header-h` on :root so other
// sticky elements (sidebar, MediaGallery day headers, DateScrubber) stack
// below the header regardless of whether a subheader is mounted.
export function MainLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = () => setDrawerOpen(false)
  const headerRef = useRef(null)

  useEffect(() => {
    if (!headerRef.current) return
    const ro = new ResizeObserver(entries => {
      const h = Math.round(entries[0].contentRect.height)
      document.documentElement.style.setProperty('--app-header-h', `${h}px`)
    })
    ro.observe(headerRef.current)
    return () => {
      ro.disconnect()
      document.documentElement.style.removeProperty('--app-header-h')
    }
  }, [])

  return (
    <>
      <AppShell
        header={
          <div ref={headerRef} className="relative">
            <AppHeader onMenu={() => setDrawerOpen(true)} />
            {/* Mobile: stacked bar below AppHeader (own bg + border).
                Desktop: absolute-positioned inside the AppHeader row,
                starting right of the OK logo. Wrapper height stays the
                AppHeader's height on desktop (absolute child doesn't contribute). */}
            <div
              id="layout-subheader"
              className="border-b border-white/5 bg-black/85 px-4 py-2 backdrop-blur md:absolute md:inset-y-0 md:left-14 md:right-12 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none"
            />
          </div>
        }
        sidebar={
          <div className="sticky top-[var(--app-header-h,3rem)] h-[calc(100vh-var(--app-header-h,3rem))] w-56 overflow-y-auto border-r border-white/5 p-3">
            <SidebarNav />
          </div>
        }
        bottomBar={<BottomBar />}
      >
        <Outlet />
      </AppShell>

      <ScrollTopButton />

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
