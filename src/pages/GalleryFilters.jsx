import { useEffect, useState } from 'react'
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

// Date-confidence floors. The gallery defaults to 'high'; lower floors reveal
// photos with less-certain dates. Maps to the API's min_confidence param.
const CONF_LEVELS = [
  { key: 'high',   label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low',    label: 'Low' },
  { key: 'all',    label: 'All' },
]

function chip(active, disabled) {
  return (
    'rounded-full px-3 py-1 text-[13px] transition-colors ' +
    (disabled
      ? 'cursor-not-allowed border border-white/5 text-white/25'
      : active
        ? 'bg-white text-black'
        : 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white')
  )
}

const GPS_LEVELS = [
  { key: 'both', label: 'All' },
  { key: 'has',  label: 'Has GPS' },
  { key: 'none', label: 'No GPS' },
]

// Drawer body. The date-confidence, undated, GPS, camera + unassigned-faces
// controls are real and wired to the gallery; the search + the top chip row
// are still mocks (see SEARCH-TODO.md).
export function GalleryFiltersBody({
  confidence = 'high', onConfidenceChange,
  undated = false, onUndatedChange,
  gps = 'both', onGpsChange,
  cameraModel = '', onCameraModelChange,
  unassignedFaces = false, onUnassignedFacesChange,
}) {
  const [active, setActive] = useState('all')
  const [cameras, setCameras] = useState([])

  // Camera models for the dropdown — distinct models with counts.
  useEffect(() => {
    fetch('/api/gallery/cameras')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setCameras(d))
      .catch(() => {})
  }, [])
  return (
    <div className="space-y-5">
      {/* Mock search — placeholder for the eventual LLM-powered search bar. */}
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
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setActive(f.key)} className={chip(active === f.key, false)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Date confidence — real, wired to the gallery feed + the year scrubber. */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">Date confidence</p>
        <div className="flex flex-wrap gap-2">
          {CONF_LEVELS.map(c => (
            <button
              key={c.key}
              disabled={undated}
              onClick={() => onConfidenceChange?.(c.key)}
              className={chip(!undated && confidence === c.key, undated)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => onUndatedChange?.(!undated)}
          className={'mt-2 ' + chip(undated, false)}
        >
          Undated · no date
        </button>
        <p className="mt-2 text-[11px] leading-snug text-white/30">
          The gallery shows high-confidence dates by default. Lower levels reveal photos
          whose dates are uncertain; <span className="text-white/45">Undated</span> shows
          scanned albums and others with no date at all.
        </p>
      </div>

      {/* Location — GPS presence. */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">Location</p>
        <div className="flex flex-wrap gap-2">
          {GPS_LEVELS.map(g => (
            <button key={g.key} onClick={() => onGpsChange?.(g.key)} className={chip(gps === g.key, false)}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera model — distinct models from the archive. */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">Camera</p>
        <select
          value={cameraModel}
          onChange={e => onCameraModelChange?.(e.target.value)}
          style={{ colorScheme: 'dark' }}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white outline-none"
        >
          <option value="" className="bg-neutral-900 text-white">Any camera</option>
          {cameras.map(c => (
            <option key={c.model} value={c.model} className="bg-neutral-900 text-white">
              {c.make ? `${c.make} ` : ''}{c.model} ({c.count})
            </option>
          ))}
        </select>
      </div>

      {/* Faces — surface photos with detected-but-unassigned faces. */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">Faces</p>
        <button
          onClick={() => onUnassignedFacesChange?.(!unassignedFaces)}
          className={chip(unassignedFaces, false)}
        >
          Unassigned faces
        </button>
        <p className="mt-2 text-[11px] leading-snug text-white/30">
          Photos with faces detected but not yet matched to a person.
        </p>
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
