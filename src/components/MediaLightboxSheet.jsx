import { useRef } from 'react'
import { cn } from '../../lib/cn'

// Mobile detail bottom-sheet for MediaLightbox. Half-open by default; drag the
// handle (or swipe up) to expand. Desktop uses a side panel instead.
export function MediaLightboxSheet({ open, setOpen, children }) {
  const touch = useRef(null)
  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-t border-white/10 bg-zinc-900 transition-transform duration-300 md:hidden',
        open ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem)]',
      )}
      style={{ height: '78vh' }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        onTouchStart={e => { touch.current = e.touches[0].clientY }}
        onTouchEnd={e => {
          if (touch.current == null) return
          const dy = e.changedTouches[0].clientY - touch.current
          touch.current = null
          if (dy < -40 && !open) setOpen(true)
          else if (dy > 40 && open) setOpen(false)
        }}
        aria-label={open ? 'Collapse details' : 'Expand details'}
        className="flex h-14 shrink-0 items-center justify-center"
      >
        <span className="h-1 w-10 rounded-full bg-white/25" />
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{children}</div>
    </div>
  )
}
