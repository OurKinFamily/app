import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

// Slide-from-right drawer with a backdrop. z above all other overlays
// (subheader z-30, bottom bar 1100, date scrubber 1200, mobile menu 1200).
export function Drawer({ open, onClose, title, children }) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[1300] transition-opacity',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'absolute right-0 top-0 flex h-full w-[90vw] max-w-md flex-col overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-2xl transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-3">
          <h2 className="text-sm font-medium text-white/80">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
