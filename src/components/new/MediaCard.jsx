import { cn } from '../../lib/cn'

// Generic cover card: anything with a cover image (collections, albums, photos, videos).
// Domain-blind — caller maps data into slots. No cover -> muted placeholder box with the icon.
export function MediaCard({ cover, coverBadge, icon, text, subtitle, description, onClick, className }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'block w-full overflow-hidden rounded-xl border border-white/8 bg-white/5 text-left transition-colors',
        onClick && 'cursor-pointer hover:bg-white/8',
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
        {cover ? (
          <>
            <img src={cover} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-md" />
            <img src={cover} alt="" className="relative h-full w-full object-contain" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/15 [&_svg]:h-7 [&_svg]:w-7">{icon}</div>
        )}
        {icon && cover && (
          <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white/80 backdrop-blur">
            {icon}
          </span>
        )}
        {coverBadge && (
          <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] text-white/80">
            {coverBadge}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="text-[13px] font-medium leading-tight text-white">{text}</div>
        {subtitle && <div className="mt-1 text-[11px] text-white/40">{subtitle}</div>}
        {description && <p className="mt-1 line-clamp-2 text-[11px] text-white/35">{description}</p>}
      </div>
    </Comp>
  )
}
