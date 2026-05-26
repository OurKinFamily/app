import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'

// Mocked filter spec. Replaced when real filtering lands. Lives in the drawer.
const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'photos',    label: 'Photos' },
  { key: 'videos',    label: 'Videos' },
  { key: 'people',    label: 'With people' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'recent',    label: 'Recent' },
]

// Drawer body — mock search bar + filter chips. Once real filter options
// exist (date range, person multi-select, etc.) this is the canonical place
// to configure them.
export function GalleryFiltersBody() {
  const [active, setActive] = useState('all')
  return (
    <div className="space-y-4">
      {/* Mock search — placeholder for the eventual LLM-powered search bar.
          See SEARCH-TODO.md. Disabled, no behavior yet. */}
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="search"
          disabled
          placeholder='Try "kids at the beach in 1994" (coming soon)'
          className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-[13px] text-white placeholder-white/30 outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const isActive = active === f.key
          return (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              className={
                'rounded-full px-3 py-1 text-[13px] transition-colors ' +
                (isActive
                  ? 'bg-white text-black'
                  : 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white')
              }
            >
              {f.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function FiltersIconButton({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label="Filters"
      className={
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white ' +
        className
      }
    >
      <SlidersHorizontal size={18} />
    </button>
  )
}
