import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare } from 'lucide-react'
import { MediaGrid } from './MediaGrid'
import { MediaDetail } from './MediaDetail'
import { LoadingDots } from './LoadingDots'
import { AlbumPicker } from './AlbumPicker'
import { SelectionBar } from './SelectionBar'
import { useMediaActions } from '../lib/useMediaActions'
import { useFavorites } from '../../lib/useFavorites'
import { C } from './tokens'

/**
 * Every photograph a person appears in.
 *
 * min_confidence=all, deliberately. The gallery hides badly-dated photographs
 * because there are thousands of them; here somebody has been identified by
 * name in this picture, and hiding it because we are unsure what year it was
 * taken would be absurd — it is also exactly where freshly-assigned stragglers
 * land.
 */

// The endpoint caps at 200, and a person's photographs are one flat list
// rather than a whole archive — so take the maximum and ask fewer times.
const PAGE = 200

export function PersonPhotos({ personId }) {
  const [items, setItems] = useState(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const bottom = useRef(null)
  const [openPath, setOpenPath] = useState(null)
  const [patched, setPatched] = useState({})
  const [versions, setVersions] = useState(() => new Map())
  const { favs: favorites, toggle: toggleFavorite } = useFavorites()
  // Selection lives here, as it does on the gallery page. MediaGrid renders
  // the checkboxes either way; without a handler to give them, `toggle`
  // returns early and clicking one does nothing at all.
  const [selected, setSelected] = useState(() => new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [albumFor, setAlbumFor] = useState(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/gallery?person_ids=${personId}&min_confidence=all&limit=${PAGE}`)
      .then(r => (r.ok ? r.json() : { media: [], total: 0 }))
      .then(d => {
        if (!alive) return
        setItems(d.media || [])
        setTotal(d.total || 0)
        setOffset((d.media || []).length)
      })
      .catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [personId])

  const reload = useCallback(() => {
    setSelected(new Set())
    setSelectionMode(false)
    // Deleting or redating changes what belongs here, so ask again rather
    // than patching the copy on screen and hoping it still matches.
    fetch(`/api/gallery?person_ids=${personId}&min_confidence=all&limit=${PAGE}`)
      .then(r => (r.ok ? r.json() : { media: [], total: 0 }))
      .then(d => { setItems(d.media || []); setTotal(d.total || 0); setOffset((d.media || []).length) })
      .catch(() => {})
  }, [personId])

  const more = useCallback(async () => {
    if (busy || !items || items.length >= total) return
    setBusy(true)
    try {
      const res = await fetch(
        `/api/gallery?person_ids=${personId}&min_confidence=all&limit=${PAGE}&offset=${offset}`,
      )
      const d = res.ok ? await res.json() : { media: [] }
      setItems(cur => [...(cur || []), ...(d.media || [])])
      setOffset(o => o + (d.media || []).length)
    } finally {
      setBusy(false)
    }
  }, [busy, items, total, offset, personId])

  // An observer fires on TRANSITIONS, not on steady state: if the sentinel is
  // already in view when the first batch lands, it never fires again and the
  // list simply stops. So the same check runs after every load, and stops when
  // the page is long enough that scrolling can do the work.
  useEffect(() => {
    const el = bottom.current
    if (!el || !items || items.length >= total) return
    const io = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) more() },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [items, total, more])

  const shown = useMemo(() => (items || []).map(it => ({
    ...it,
    aspect: it.width && it.height ? it.width / it.height : 1,
    ...patched[it.path],
  })), [items, patched])

  const open = openPath ? shown.find(m => m.path === openPath) || null : null
  const index = open ? shown.findIndex(m => m.path === open.path) : -1

  const onVersion = useCallback((path, patch) => {
    setVersions(cur => new Map(cur).set(path, patch.version))
    setPatched(cur => ({ ...cur, [path]: patch }))
  }, [])

  const actions = useMediaActions({
    openPath,
    close: useCallback(() => setOpenPath(null), []),
    onVersion,
    onRemoved: useCallback(path => {
      setItems(cur => (cur || []).filter(i => i.path !== path))
      setTotal(t => Math.max(0, t - 1))
    }, []),
  })

  if (items === null) return <LoadingDots />
  if (items.length === 0) return null

  return (
    <section style={{ marginTop: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8,
      }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Photographs</h2>
        <span style={{ fontSize: 12.5, color: C.muted }}>{total.toLocaleString()}</span>
        <div style={{ flex: 1 }} />
        {!selectionMode && selected.size === 0 && (
          <button
            type="button"
            onClick={() => setSelectionMode(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              border: 0, background: 'transparent', color: C.activeText,
              fontSize: 12.5, cursor: 'pointer',
            }}
          >
            <CheckSquare size={14} /> Select
          </button>
        )}
        <Link
          to={`/v2/faces/similar?person_id=${personId}`}
          title="Look for more of them across the archive"
          style={{ fontSize: 12.5, color: C.activeText, textDecoration: 'none' }}
        >
          Find more →
        </Link>
      </div>

      {(selectionMode || selected.size > 0) && (
        <SelectionBar
          paths={[...selected]}
          onClear={() => { setSelected(new Set()); setSelectionMode(false) }}
          onAddToAlbum={setAlbumFor}
          onChanged={reload}
          compact
        />
      )}

      <MediaGrid
        items={shown}
        selected={selected}
        onSelectionChange={setSelected}
        selectionMode={selectionMode}
        onRequestSelectionMode={() => setSelectionMode(true)}
        favourites={favorites}
        onToggleFavourite={toggleFavorite}
        onOpen={item => setOpenPath(item.path)}
        versions={versions}
        showUndatedSection={false}
      />

      {/* The sentinel sits below the grid; reaching it fetches the next page.
          Given room to work — 600px — so the next batch is usually there
          before the reader arrives at the bottom. */}
      <div ref={bottom} style={{ height: 1 }} />

      {busy && <LoadingDots />}

      {albumFor && (
        <AlbumPicker paths={albumFor} onClose={() => setAlbumFor(null)} />
      )}

      {open && (
        <MediaDetail
          item={open}
          onClose={() => setOpenPath(null)}
          favourited={favorites?.has(open.path)}
          onToggleFavourite={toggleFavorite}
          onRedate={actions.redate}
          onRelocate={actions.relocate}
          onAssignFace={actions.assignFace}
          onCreatePerson={actions.createPerson}
          onDismissFace={actions.dismissFace}
          onUnassignFace={actions.unassignFace}
          onRotate={actions.rotate}
          onCrop={actions.crop}
          onRestorePreview={actions.restorePreview}
          onRestoreDiscard={actions.restoreDiscard}
          onRestoreApply={actions.restoreApply}
          onDescribe={actions.describe}
          onDownload={actions.download}
          onDelete={actions.remove}
          hasPrev={index > 0}
          hasNext={index >= 0 && index < shown.length - 1}
          onPrev={() => setOpenPath(shown[index - 1]?.path || null)}
          onNext={() => setOpenPath(shown[index + 1]?.path || null)}
        />
      )}
    </section>
  )
}
