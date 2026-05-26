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
        {coverBadge && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] text-white/80">
            {coverBadge}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="text-white">{text}</div>
        {subtitle && (
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-white/40">
            {icon}
            {subtitle}
          </div>
        )}
        {description && <p className="mt-1.5 line-clamp-2 text-sm text-white/40">{description}</p>}
      </div>
    </Comp>
  )
}
