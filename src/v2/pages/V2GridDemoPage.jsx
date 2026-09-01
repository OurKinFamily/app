import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MediaGrid } from '../ui/MediaGrid'
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
  const [items, setItems] = useState([])
  const [undated, setUndated] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [favourites, setFavourites] = useState(() => new Set())
  const [opened, setOpened] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/gallery?limit=200').then(r => (r.ok ? r.json() : { media: [] })),
      fetch('/api/gallery?undated=true&limit=40').then(r => (r.ok ? r.json() : { media: [] })),
    ])
      .then(([dated, un]) => {
        setItems(dated.media || [])
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

      <h1 style={{ fontSize: 22, fontWeight: 400, margin: '0 0 8px' }}>Grid</h1>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 24px', maxWidth: '62ch' }}>
        Real photographs, justified rows, current month grouped by day and everything
        older by month. Resize the window — row height drops on narrow screens so you
        still get three or four across rather than one enormous column.
      </p>

      {/* Selection bar — the reason the page owns the selection rather than the
          grid: the count and the actions live outside it. */}
      {selected.size > 0 && (
        <div
          style={{
            position: 'sticky', top: 64, zIndex: 5,
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '10px 0', background: C.bg,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <strong style={{ fontWeight: 500 }}>{selected.size} selected</strong>
          <button
            type="button"
            onClick={clear}
            style={{ border: 0, background: 'transparent', color: C.activeText,
                     fontSize: 13, cursor: 'pointer' }}
          >
            Clear
          </button>
          <span style={{ fontSize: 12, color: C.muted }}>
            Long-press a photo to enter selection mode on touch.
          </span>
        </div>
      )}

      {loading
        ? <div style={{ fontSize: 13, color: C.muted }}>Loading…</div>
        : (
          <MediaGrid
            items={items}
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
