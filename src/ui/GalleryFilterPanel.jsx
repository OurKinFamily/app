import { useEffect } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { C } from './tokens'
import { NO_FILTERS, CONFIDENCE_CHOICES, activeCount } from './galleryFilters'

/**
 * The gallery's filters, as a drawer that slides in from the right.
 *
 * Over the page rather than beside it: an inline panel pushed the grid
 * sideways every time it opened, which reflowed every row and lost your place
 * in a scroll of 180,000 photographs. Sliding over costs nothing but the strip
 * it covers.
 *
 * No scrim behind it, deliberately. The point of a filter is to watch the
 * result change, and dimming the photographs to show a panel about the
 * photographs defeats it.
 *
 * Always mounted, moved off-screen by a transform when closed — the drawer has
 * to be in the DOM to animate out of it, and `visibility` keeps it off the tab
 * order while it is away.
 */

function Choice({ label, options, value, onChange, hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em',
        color: C.muted, marginBottom: 7,
      }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(o => {
          const on = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              style={{
                padding: '5px 11px', borderRadius: 14, fontSize: 13, cursor: 'pointer',
                border: `1px solid ${on ? C.activeText : C.border}`,
                background: on ? C.activeBg : 'transparent',
                color: on ? C.activeText : C.text,
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

export function GalleryFilterPanel({ open, filters, onChange, onClose, total }) {
  const set = (k, v) => onChange({ ...filters, [k]: v })
  const n = activeCount(filters)

  // Escape closes it, as it would any overlay.
  useEffect(() => {
    if (!open) return undefined
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <aside
      aria-label="Filters"
      aria-hidden={!open}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 60,
        width: 300, maxWidth: '85vw',
        background: C.bg, borderLeft: `1px solid ${C.border}`,
        boxShadow: open ? '-8px 0 28px rgba(0,0,0,0.10)' : 'none',
        padding: 20, boxSizing: 'border-box',
        overflowY: 'auto',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        visibility: open ? 'visible' : 'hidden',
        transition: 'transform 200ms ease, visibility 200ms, box-shadow 200ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <strong style={{ fontSize: 14, fontWeight: 500 }}>Filters</strong>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          // A 36px target rather than a 20px one: it is the only way out of
          // the drawer besides Escape, and it sits in the corner where the
          // pointer has furthest to travel.
          style={{
            border: 'none', background: 'transparent', color: C.muted,
            cursor: 'pointer', display: 'grid', placeItems: 'center',
            width: 36, height: 36, borderRadius: 18, marginRight: -8,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.hover }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <X size={22} />
        </button>
      </div>

      {typeof total === 'number' && (
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          {total.toLocaleString()} {total === 1 ? 'photo' : 'photos'}
        </div>
      )}

      <Choice
        label="Date confidence"
        options={CONFIDENCE_CHOICES}
        value={filters.confidence}
        onChange={v => set('confidence', v)}
        hint={filters.confidence === 'all'
          ? 'Everything, however well or badly dated.'
          : filters.confidenceExact
            ? `Only photos dated with ${filters.confidence} confidence.`
            : `${filters.confidence[0].toUpperCase()}${filters.confidence.slice(1)} confidence and better.`}
      />

      {filters.confidence !== 'all' && (
        <Choice
          label="Match"
          options={[
            { value: false, label: 'And better' },
            { value: true, label: 'Only this' },
          ]}
          value={filters.confidenceExact}
          onChange={v => set('confidenceExact', v)}
          hint="“Only this” is how you find what still needs a date."
        />
      )}

      <Choice
        label="Type"
        options={[
          { value: 'all', label: 'Any' },
          { value: 'photo', label: 'Photos' },
          { value: 'video', label: 'Videos' },
        ]}
        value={filters.mediaType}
        onChange={v => set('mediaType', v)}
      />

      <Choice
        label="Location"
        options={[
          { value: 'both', label: 'Any' },
          { value: 'has', label: 'Has GPS' },
          { value: 'none', label: 'No GPS' },
        ]}
        value={filters.gps}
        onChange={v => set('gps', v)}
      />

      <Choice
        label="Faces"
        options={[
          { value: 'any', label: 'Any' },
          { value: 'unassigned', label: 'Needs naming' },
        ]}
        value={filters.faces}
        onChange={v => set('faces', v)}
        hint={filters.faces === 'unassigned'
          ? 'Faces were found but nobody has been named yet.'
          : undefined}
      />

      {/* At the bottom, because reaching for it is the last thing you do —
          after reading what the filters did, not before. Only rendered when
          there is something to clear, so it never reads as an action you are
          expected to take. */}
      {n > 0 && (
        <button
          type="button"
          onClick={() => onChange({ ...NO_FILTERS })}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            gap: 7, width: '100%', height: 36, marginTop: 8,
            border: `1px solid ${C.border}`, borderRadius: 18,
            background: 'transparent', color: C.text,
            fontSize: 13, cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.hover }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <RotateCcw size={14} /> Clear {n} filter{n === 1 ? '' : 's'}
        </button>
      )}
    </aside>
  )
}
