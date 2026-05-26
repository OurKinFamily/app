import { cn } from '../../lib/cn'

// Top-level app frame: header (top) · sidebar (desktop) · main content · bottomBar (mobile).
// Pure layout, all slots optional. Caller fills each region.
export function AppShell({ header, sidebar, bottomBar, children, className }) {
  return (
    <div className={cn('flex min-h-screen flex-col', className)}>
      {header && <div className="shrink-0">{header}</div>}
      <div className="flex min-h-0 flex-1">
        {sidebar && <aside className="hidden shrink-0 md:block">{sidebar}</aside>}
        <main className="min-w-0 flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
      </div>
      {bottomBar && (
        <div className="fixed inset-x-0 bottom-0 z-[1100] md:hidden">{bottomBar}</div>
      )}
    </div>
  )
}
