import { cn } from '../../lib/cn'

// Small icon action button. Stops propagation so it won't trigger a parent's
// click handler (e.g. the lightbox's tap-to-toggle-chrome).
export function IconButton({ children, onClick, label, active, className }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={e => { e.stopPropagation(); onClick?.(e) }}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white',
        active && 'text-red-500 hover:text-red-400',
        className,
      )}
    >
      {children}
    </button>
  )
}
