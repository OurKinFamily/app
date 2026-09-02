import { useCallback, useEffect, useState } from 'react'
import { CheckSquare, X } from 'lucide-react'
import { TimelineGrid } from '../ui/TimelineGrid'
import { UndatedSection } from '../ui/UndatedSection'
import { LoadingDots } from '../ui/LoadingDots'
import { MediaDetail } from '../ui/MediaDetail'
import { useFavorites } from '../../lib/useFavorites'
import { C } from '../ui/tokens'

/**
 * The gallery. The real one — live data, live actions.
 *
 * The page owns the data and the intent; the grid owns layout and selection
 * mechanics; the detail view owns one photograph. Everything below this is
 * reusable, which is the point: an album page or a person page brings its own
 * source and reuses all of it.
 *
 * The design pages remain as they are, on frozen fixtures, so a change here
 * cannot quietly rewrite the reference.
 */

// Filters are part of the identity of a view: the counts that shape the
// timeline must be fetched with the same ones as the items, or the layout
// reserves space that never fills.
const PARAMS = 'min_confidence=high'

export function V2GalleryPage() {
  const [buckets, setBuckets] = useState(null)
  const [undated, setUndated] = useState([])
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState(() => new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [open, setOpen] = useState(null)
  const [ordered, setOrdered] = useState([])

  const { favs: favorites, toggle: toggleFavorite } = useFavorites()

  useEffect(() => {
    Promise.all([
      fetch(`/api/gallery/counts?bucket=month&${PARAMS}`)
        .then(r => (r.ok ? r.json() : { buckets: [] })),
      fetch('/api/gallery?undated=true&limit=60')
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

  const clearSelection = useCallback(() => {
    setSelected(new Set())
    setSelectionMode(false)
  }, [])

  // ── actions ───────────────────────────────────────────────────────────────
  //
  // Each one writes and then leaves the local copy alone. A refetch of the
  // whole month to reflect one changed date would throw away the reader's
  // place in an 8.6-million-pixel page.

  const redate = useCallback(async (item, patch) => {
    await fetch(`/api/gallery/media?path=${encodeURIComponent(item.path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }, [])

  const relocate = useCallback(async (item, patch) => {
    await fetch(`/api/gallery/media/location?path=${encodeURIComponent(item.path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }, [])

  const assignFace = useCallback(async (face, person) => {
    await fetch('/api/faces/search/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        person_id: person.id,
        faces: [{ photo_path: open?.path, face_index: face.face_index }],
      }),
    })
  }, [open])

  const createPerson = useCallback(async (face, name) => {
    const res = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return
    const person = await res.json()
    if (person?.id) await assignFace(face, person)
  }, [assignFace])

  const dismissFace = useCallback(async face => {
    await fetch('/api/faces/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faces: [{ photo_path: open?.path, face_index: face.face_index }],
      }),
    })
  }, [open])

  const rotate = useCallback(async item => {
    await fetch(
      `/api/gallery/media/rotate?path=${encodeURIComponent(item.path)}&degrees=90`,
      { method: 'POST' },
    )
    // The file changed underneath its own URL, so the browser would keep
    // showing the old pixels. Close and reopen with a fresh cache key.
    setOpen(null)
  }, [])

  const remove = useCallback(async item => {
    await fetch(`/api/gallery/media?path=${encodeURIComponent(item.path)}`, {
      method: 'DELETE',
    })
    setOpen(null)
  }, [])

  // Where the open photograph sits in what has loaded, so the arrows know
  // whether there is anywhere to go.
  const index = open ? ordered.findIndex(m => m.path === open.path) : -1
  const step = useCallback(delta => {
    const next = ordered[index + delta]
    if (next) setOpen(next)
  }, [ordered, index])

  const download = useCallback(item => {
    const a = document.createElement('a')
    a.href = item.url
    a.download = item.filename || ''
    a.click()
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Gallery</h1>
        <div style={{ flex: 1 }} />
        {!selectionMode && selected.size === 0 && (
          <button
            type="button"
            onClick={() => setSelectionMode(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              height: 34, padding: '0 14px', borderRadius: 17,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.text, fontSize: 13, cursor: 'pointer',
            }}
          >
            <CheckSquare size={15} /> Select
          </button>
        )}
      </div>

      {(selectionMode || selected.size > 0) && (
        <div
          style={{
            position: 'sticky', top: 64, zIndex: 5,
            display: 'flex', alignItems: 'center', gap: 16,
            margin: '0 -6px', padding: '8px 6px', background: C.bg,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Leave selection mode"
            style={{
              display: 'grid', placeItems: 'center', width: 32, height: 32,
              border: 0, borderRadius: '50%', background: 'transparent',
              color: C.muted, cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
          <strong style={{ fontWeight: 500, fontSize: 14 }}>
            {selected.size > 0 ? `${selected.size} selected` : 'Select photos'}
          </strong>
          <div style={{ flex: 1 }} />
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              style={{
                border: 0, background: 'transparent', color: C.activeText,
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {loading
        ? <LoadingDots />
        : (
          <>
          {undated.length > 0 && (
            <UndatedSection
              items={undated}
              favourites={favorites}
              onToggleFavourite={toggleFavorite}
              onOpen={setOpen}
            />
          )}
          <TimelineGrid
            buckets={buckets}
            params={PARAMS}
            selected={selected}
            onSelectionChange={setSelected}
            selectionMode={selectionMode}
            onRequestSelectionMode={() => setSelectionMode(true)}
            favourites={favorites}
            onToggleFavourite={toggleFavorite}
            onOrderedChange={setOrdered}
            onOpen={setOpen}
          />
          </>
        )}

      {open && (
        <MediaDetail
          item={open}
          onClose={() => setOpen(null)}
          favourited={favorites?.has(open.path)}
          onToggleFavourite={toggleFavorite}
          onRedate={redate}
          onRelocate={relocate}
          onAssignFace={assignFace}
          onCreatePerson={createPerson}
          onDismissFace={dismissFace}
          onRotate={rotate}
          onDownload={download}
          onDelete={remove}
          hasPrev={index > 0}
          hasNext={index >= 0 && index < ordered.length - 1}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />
      )}
    </div>
  )
}
