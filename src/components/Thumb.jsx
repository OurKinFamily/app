import { cn } from '../../lib/cn'

// Small square thumbnail — face crops, object crops, page thumbs. Optional
// selected ring + onClick. Lighter than Media (no favorite / video / justify).
export function Thumb({ src, alt = '', selected, onClick, className }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-white/5 transition',
        selected ? 'ring-[3px] ring-blue-500' : 'ring-2 ring-transparent',
        onClick && !selected && 'hover:ring-white/30',
        className,
      )}
    >
      {src && <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />}
    </Comp>
  )
}
