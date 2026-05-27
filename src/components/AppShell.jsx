import { cn } from '../lib/cn'

// Top-level app frame: header (top) · sidebar (desktop) · main · bottomBar (mobile).
// The page (window) scrolls; header is sticky, the sidebar slot is sticky inside its column.
// Pure layout, all slots optional. `sidebarHidden` collapses the desktop sidebar.
export function AppShell({ header, sidebar, sidebarHidden = false, bottomBar, children, className }) {
  return (
    <div className={cn('flex min-h-screen flex-col', className)}>
      {header && <div className="sticky top-0 z-30 shrink-0">{header}</div>}
      <div className="flex flex-1">
        {sidebar && !sidebarHidden && <aside className="hidden shrink-0 md:block">{sidebar}</aside>}
        <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>
      </div>
      {bottomBar && (
        <div className="fixed inset-x-0 bottom-0 z-[1100] md:hidden">{bottomBar}</div>
      )}
    </div>
  )
}
