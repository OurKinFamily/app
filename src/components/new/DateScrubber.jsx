import { cn } from '../../lib/cn'

const NEWEST = new Date().getFullYear()
const OLDEST = 1900
const YEARS = Array.from({ length: NEWEST - OLDEST + 1 }, (_, i) => NEWEST - i)

// Right-edge clickable year list. Highlights the active (filtered) year and the
// "current" year (the year of whatever's currently in view from the parent's scroll tracking).
// Desktop only — mobile chrome is too tight.
export function DateScrubber({ activeYear, currentYear, onJump }) {
  return (
    <div className="fixed right-0 top-12 z-20 hidden h-[calc(100vh-3rem)] w-14 flex-col items-end overflow-y-auto py-2 md:flex">
      {YEARS.map(y => {
        const isActive = activeYear === y
        const isCurrent = currentYear === y && !isActive
        return (
          <button
            key={y}
            onClick={() => onJump(y === activeYear ? null : y)}
            className={cn(
              'w-full px-2 py-0.5 text-right text-[10px] tabular-nums transition-colors',
              isActive ? 'text-white font-medium'
                : isCurrent ? 'text-white/80'
                : 'text-white/25 hover:text-white/60',
            )}
          >
            {y}
          </button>
        )
      })}
    </div>
  )
}
