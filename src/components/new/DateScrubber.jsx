import { cn } from '../../lib/cn'

// Right-edge clickable year list. `years` is an array of {year, count} from
// /api/gallery/years — only years that actually exist in the catalog. Highlights
// the active (filtered) year and the "current" year (visible in viewport).
// Desktop only — mobile chrome is too tight.
export function DateScrubber({ years = [], currentYear, onJump }) {
  if (!years.length) return null
  return (
    <div className="hide-scrollbar fixed right-0 top-12 z-[1200] flex h-[calc(100vh-3rem)] w-10 flex-col items-stretch overflow-y-auto bg-black/20 py-2 pb-20 transition-colors hover:bg-black/85 md:w-14 md:pb-2">
      {years.map(({ year }) => {
        const isCurrent = currentYear === year
        return (
          <button
            key={year}
            onClick={() => onJump(year)}
            className={cn(
              'w-full px-2 py-0.5 text-right text-[10px] tabular-nums transition-colors hover:bg-black/70',
              isCurrent ? 'text-white font-medium' : 'text-white/40',
            )}
          >
            {year}
          </button>
        )
      })}
    </div>
  )
}
