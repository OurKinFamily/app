// Generic single-frame tile, designed to compose into a horizontal strip
// (PhotoStrip). No domain knowledge. Every frame has the same outer
// dimensions so a row of them reads as a true grid: caption is painted
// as a translucent ribbon INSIDE the top of the image, avatar slot is
// reserved whether or not an avatar is supplied.
//
// Props (all optional except `image`):
//   image:    { src, alt }                 — required main thumbnail
//   caption:  string                       — overlaid ribbon at the top of the image
//   avatar:   { src, alt? }                — small circular crop, bottom-center overlay
//   badge:    ReactNode                    — corner indicator (hover-only)
//   actions:  [{ icon, title, onClick }]   — hover action buttons (top-right)
//   onClick:  () => void                   — main image click
//   title:    string                       — tooltip on the main image
//   size:     px (default 96)              — square edge of the image

const DEFAULT_SIZE = 96

export function StripFrame({
  image,
  caption,
  avatar,
  badge,
  actions = [],
  onClick,
  title,
  size = DEFAULT_SIZE,
}) {
  const interactive = typeof onClick === 'function'
  return (
    <div className="group flex shrink-0 flex-col items-center">
      <div className="relative" style={{ height: size, width: size }}>
        {interactive ? (
          <button
            type="button"
            onClick={onClick}
            title={title}
            className="block h-full w-full overflow-hidden rounded-lg ring-1 ring-white/10 transition-all hover:ring-white/30"
          >
            <img src={image.src} alt={image.alt || ''} loading="lazy" className="h-full w-full object-cover" />
          </button>
        ) : (
          <div title={title} className="block h-full w-full overflow-hidden rounded-lg ring-1 ring-white/10">
            <img src={image.src} alt={image.alt || ''} loading="lazy" className="h-full w-full object-cover" />
          </div>
        )}

        {caption && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-lg bg-black/55 px-2 py-px text-center text-[10px] font-medium leading-tight uppercase tracking-wide text-white/85">
            {caption}
          </span>
        )}

        {avatar && (
          <img
            src={avatar.src}
            alt={avatar.alt || ''}
            loading="lazy"
            className="pointer-events-none absolute left-1 top-1 h-7 w-7 rounded-full object-cover opacity-0 ring-2 ring-black/80 transition-opacity group-hover:opacity-100"
          />
        )}

        {badge && (
          <span className="pointer-events-none absolute right-1 top-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
            {badge}
          </span>
        )}

        {actions.length > 0 && (
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-black/65 opacity-0 transition-opacity group-hover:opacity-100" />
        )}

        {actions.length > 0 && (
          <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-1 opacity-0 transition-opacity group-hover:opacity-100">
            {actions.map((a, i) => (
              <button
                key={a.key ?? i}
                type="button"
                onClick={a.onClick}
                title={a.title}
                className={`rounded-full bg-black/70 p-1 transition-colors hover:bg-black ${a.tone || 'text-white/80 hover:text-white'}`}
              >
                {a.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
