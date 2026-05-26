import { cn } from '../../lib/cn'

// Right-edge clickable year list. `years` is an array of {year, count} from
// /api/gallery/years — only years that actually exist in the catalog. Highlights
// the active (filtered) year and the "current" year (visible in viewport).
// Desktop only — mobile chrome is too tight.
export function DateScrubber({ years = [], activeYear, currentYear, onJump }) {
  if (!years.length) return null
  return (
    <div className="hide-scrollbar fixed right-0 top-12 z-20 hidden h-[calc(100vh-3rem)] w-14 flex-col items-stretch overflow-y-auto bg-black/20 py-2 md:flex">
      {years.map(({ year }) => {
        const isActive = activeYear === year
        const isCurrent = currentYear === year && !isActive
        return (
          <button
            key={year}
            onClick={() => onJump(year === activeYear ? null : year)}
            className={cn(
              'w-full px-2 py-0.5 text-right text-[10px] tabular-nums transition-colors hover:bg-black/70',
              isActive ? 'text-white font-medium'
                : isCurrent ? 'text-white/80'
                : 'text-white/40',
            )}
          >
            {year}
          </button>
        )
      })}
    </div>
  )
}
