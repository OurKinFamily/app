import { cn } from '../../lib/cn'

// MediaCard + MediaRow — two layouts of the same data.
//
// They live in one file so changes propagate. Both consume identical props:
//   { cover, coverBadge, icon, text, subtitle, description, trailing, onClick, className }
// The view-toggle code can then read:
//   const Comp = viewMode === 'grid' ? MediaCard : MediaRow
//   <Comp { ...sameProps } />
//
// `cover` is an image URL (or null). When null, the cover area falls back to
// the muted-box rendering of `icon`. `icon` also overlays the top-left of the
// cover when present. `coverBadge` sits top-right.

export function MediaCard({ cover, coverBadge, icon, text, subtitle, description, trailing, onClick, className }) {
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
        {trailing && <div className="mt-1 text-[11px] text-white/40">{trailing}</div>}
      </div>
    </Comp>
  )
}

export function MediaRow({ cover, coverBadge, icon, text, subtitle, description, trailing, onClick, className }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-left transition-colors',
        onClick && 'cursor-pointer hover:bg-white/8',
        className,
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/5">
        {cover
          ? <img src={cover} alt="" className="h-full w-full object-cover" />
          : <span className="text-white/30 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-white">{text}</span>
        {(subtitle || description) && (
          <span className="block truncate text-[11px] text-white/40">
            {subtitle}
            {subtitle && description && <span className="text-white/30"> · </span>}
            {description && <span className="text-white/35">{description}</span>}
          </span>
        )}
      </span>
      {/* Row trailing slot: explicit `trailing` prop wins; otherwise fall back
          to coverBadge so the same prop set as MediaCard yields a sensible row. */}
      {(trailing || coverBadge) && (
        <span className="shrink-0 text-[11px] text-white/40">{trailing || coverBadge}</span>
      )}
    </Comp>
  )
}
