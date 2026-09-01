import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, X, CheckSquare } from 'lucide-react'
import { VirtualMediaGrid } from '../ui/VirtualMediaGrid'
import { C } from '../ui/tokens'

/**
 * Grid demo — a stand-in for the real gallery, on real data.
 *
 * Lives outside the style guide because a grid can only be judged at full
 * width with a few hundred actual photographs in it. The style guide links
 * here rather than embedding it.
 *
 * This page owns the data and the selection; MediaGrid owns layout and the
 * interactions. That split is the point — an album page or a person page will
 * bring their own source and reuse the same grid.
 */
export function V2GridDemoPage() {
  const [buckets, setBuckets] = useState(null)
  const [undated, setUndated] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [favourites, setFavourites] = useState(() => new Set())
  const [opened, setOpened] = useState(null)
  const [visibleBucket, setVisibleBucket] = useState(null)
  const [loading, setLoading] = useState(true)

  // The whole timeline's shape in one request — 597 months, ~280ms — so the
  // page can be the right height before any photograph has loaded. Items
  // arrive per month as they come into view.
  const PARAMS = 'min_confidence=high'

  useEffect(() => {
    Promise.all([
      fetch(`/api/gallery/counts?bucket=month&${PARAMS}`)
        .then(r => (r.ok ? r.json() : { buckets: [] })),
      fetch('/api/gallery?undated=true&limit=40')
        .then(r => (r.ok ? r.json() : { media: [] })),
    ])
      .then(([counts, un]) => {
        setBuckets((counts.buckets || []).map(b => ({
          ...b,
          label: new Date(b.bucket + '-01T00:00:00')
            .toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        })))
        setUndated(un.media || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const clear = useCallback(() => {
    setSelected(new Set())
    setSelectionMode(false)
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 4px' }}>
        <Link
          to="/v2/design/components"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                   color: C.muted, textDecoration: 'none', fontSize: 13 }}
        >
          <ArrowLeft size={16} /> Components
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: '0 0 8px' }}>Grid</h1>
        <div style={{ flex: 1 }} />
        {!selectionMode && selected.size === 0 && (
          <button
            type="button"
            onClick={() => setSelectionMode(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              height: 36, padding: '0 16px', borderRadius: 18,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.text, fontSize: 14, cursor: 'pointer',
            }}
          >
            <CheckSquare size={16} /> Select
          </button>
        )}
      </div>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 24px', maxWidth: '62ch' }}>
        The whole archive, virtualised: {buckets ? `${buckets.length} months` : '…'} laid
        out from a single counts request, with photographs fetched a month at a time as
        they come into view. Scroll anywhere — the scrollbar is honest even where
        nothing has loaded yet.
        {visibleBucket && <> Currently at <strong>{visibleBucket}</strong>.</>}
      </p>

      {/* Selection bar — the reason the page owns the selection rather than the
          grid: the count and the actions live outside it. */}
      {/* Shown whenever selection mode is on, not merely when something is
          selected: long-press enters the mode with nothing picked yet, and
          without a bar there is no way back out on a touch device. */}
      {(selectionMode || selected.size > 0) && (
        <div
          style={{
            position: 'sticky', top: 64, zIndex: 5,
            display: 'flex', alignItems: 'center', gap: 16,
            // Same rounding bleed as the group headers.
            margin: '0 -6px', padding: '10px 6px', background: C.bg,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <button
            type="button"
            onClick={clear}
            aria-label="Leave selection mode"
            style={{
              display: 'grid', placeItems: 'center', width: 36, height: 36,
              border: 0, borderRadius: '50%', background: 'transparent',
              color: C.muted, cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>

          <strong style={{ fontWeight: 500 }}>
            {selected.size > 0 ? `${selected.size} selected` : 'Select photos'}
          </strong>

          <div style={{ flex: 1 }} />

          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              style={{ border: 0, background: 'transparent', color: C.activeText,
                       fontSize: 13, cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={clear}
            style={{
              height: 36, padding: '0 20px', borderRadius: 18, border: 0,
              background: C.activeBg, color: C.activeText,
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      )}

      {loading
        ? <div style={{ fontSize: 13, color: C.muted }}>Loading…</div>
        : (
          <VirtualMediaGrid
            buckets={buckets}
            params={PARAMS}
            undatedItems={undated}
            selected={selected}
            onSelectionChange={setSelected}
            selectionMode={selectionMode}
            onRequestSelectionMode={() => setSelectionMode(true)}
            favourites={favourites}
            onToggleFavourite={it => setFavourites(prev => {
              const next = new Set(prev)
              next.has(it.path) ? next.delete(it.path) : next.add(it.path)
              return next
            })}
            onOpen={it => setOpened(it.filename)}
            onVisibleDateChange={setVisibleBucket}
          />
        )}

      {opened && (
        <p style={{ fontSize: 12, color: C.muted, marginTop: 16 }}>
          Opened: {opened} — a real gallery would show the detail view here.
        </p>
      )}
    </div>
  )
}
