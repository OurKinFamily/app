import { Play, Heart } from 'lucide-react'
import { cn } from '../../lib/cn'

// Single media tile — a photo or video thumbnail. Fills its container; the parent
// (e.g. the justified MediaGallery) decides the box shape, so cover never crops.
// - dominant color fills the box before the image loads
// - favorite heart: hidden until hover; once favorited it stays visible and red
export function Media({ thumb, isVideo, color, alt = '', favorited, onFavorite, onClick, className }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      style={color ? { backgroundColor: color } : undefined}
      className={cn(
        'group relative h-full w-full overflow-hidden rounded-md bg-white/5',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {thumb && (
        <img
          src={thumb}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      )}

      {isVideo && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur">
            <Play size={16} className="translate-x-[1px] fill-white text-white" />
          </span>
        </span>
      )}

      {onFavorite && (
        <span
          role="button"
          tabIndex={0}
          aria-label={favorited ? 'Unfavorite' : 'Favorite'}
          onClick={e => { e.stopPropagation(); onFavorite() }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onFavorite() } }}
          className={cn(
            'absolute right-2 top-2 cursor-pointer transition-opacity',
            favorited ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <Heart
            size={18}
            className={cn('drop-shadow', favorited ? 'fill-red-500 text-red-500' : 'fill-black/30 text-white')}
          />
        </span>
      )}
    </Comp>
  )
}
