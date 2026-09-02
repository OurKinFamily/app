import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { CheckSquare, X } from 'lucide-react'
import { TimelineGrid } from '../ui/TimelineGrid'
import { UndatedSection } from '../ui/UndatedSection'
import { LoadingDots } from '../ui/LoadingDots'
import { MediaDetail } from '../ui/MediaDetail'
import { AlbumPicker } from '../ui/AlbumPicker'
import { useFavorites } from '../../lib/useFavorites'
import { useMediaActions } from '../lib/useMediaActions'
import { mediaUrl, thumbUrl } from '../../lib/media'
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

/**
 * @param title    what the heading says.
 * @param params   the query string every fetch carries — the identity of the
 *                 view. Favourites is this page with one more filter.
 * @param showUndated  the undated section belongs to the whole archive; a
 *                 filtered view has no use for it.
 * @param emptyMessage  shown when the filter matches nothing, which the whole
 *                 archive never does but a filtered view easily can.
 */
export function V2GalleryPage({
  title = 'Gallery',
  params = PARAMS,
  showUndated = true,
  emptyMessage,
  // Where this view lives, so the open photograph can have an address.
  basePath = '/v2',
}) {
  const [buckets, setBuckets] = useState(null)
  const [undated, setUndated] = useState([])
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState(() => new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  // Paths waiting to be filed. One from the lightbox, or the whole selection.
  const [albumFor, setAlbumFor] = useState(null)
  const [ordered, setOrdered] = useState([])

  // The open photograph lives in the URL, not in state.
  //
  // Without it there is nothing to send someone, nothing to bookmark, and the
  // back button leaves the gallery entirely rather than closing the picture in
  // front of you. The route is a child of this one, so the page stays mounted
  // underneath and keeps its scroll position and its loaded months.
  const navigate = useNavigate()
  const match = useMatch(`${basePath}/photo/*`)
  const openPath = match?.params['*'] || null

  // A photograph reached by its URL will not be in the loaded set — that is
  // the whole point of a link. Rather than paging through the archive to find
  // it, stand up the little that is needed to display it; the info panel
  // fetches the rest by path anyway.
  const [patched, setPatched] = useState({})
  const loadedItem = openPath ? ordered.find(m => m.path === openPath) : null
  const open = useMemo(() => openPath
    ? {
        ...(loadedItem || {
          path: openPath,
          url: mediaUrl(openPath),
          thumbnail_url: thumbUrl(openPath),
          filename: openPath.split('/').pop(),
        }),
        ...patched[openPath],
      }
    : null,
  [openPath, loadedItem, patched])

  const setOpen = useCallback((item, { replace = false } = {}) => {
    if (item?.path) navigate(`${basePath}/photo/${item.path}`, { replace })
    else if (window.history.length > 1) navigate(-1)
    else navigate(basePath)
  }, [navigate, basePath])
  // path -> cache token, for files this session has edited on disk. A rotated
  // photograph keeps its URL, so without this the browser goes on showing the
  // pixels it already has.
  const [versions, setVersions] = useState(() => new Map())

  const { favs: favorites, toggle: toggleFavorite } = useFavorites()

  useEffect(() => {
    Promise.all([
      fetch(`/api/gallery/counts?bucket=month&${params}`)
        .then(r => (r.ok ? r.json() : { buckets: [] })),
      showUndated
        ? fetch('/api/gallery?undated=true&limit=60')
            .then(r => (r.ok ? r.json() : { media: [] }))
        : Promise.resolve({ media: [] }),
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
  }, [params, showUndated])

  const clearSelection = useCallback(() => {
    setSelected(new Set())
    setSelectionMode(false)
  }, [])

  // Rotation changes the file and its dimensions; both the open photograph and
  // its tile in the grid need to hear about it.
  const onVersion = useCallback((path, patch) => {
    setVersions(cur => new Map(cur).set(path, patch.version))
    setPatched(cur => ({ ...cur, [path]: patch }))
  }, [])

  const {
    redate, relocate, assignFace, createPerson, dismissFace,
    rotate, remove, download,
  } = useMediaActions({
    openPath,
    close: useCallback(() => setOpen(null), [setOpen]),
    onVersion,
  })

  // Where the open photograph sits in what has loaded, so the arrows know
  // whether there is anywhere to go.
  const index = open ? ordered.findIndex(m => m.path === open.path) : -1
  const step = useCallback(delta => {
    const next = ordered[index + delta]
    if (next) setOpen(next, { replace: true })
  }, [ordered, index, setOpen])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>{title}</h1>
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
              onClick={() => setAlbumFor([...selected])}
              style={{
                border: 0, background: 'transparent', color: C.activeText,
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Add to album
            </button>
          )}
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
        : buckets?.length === 0 && undated.length === 0
        ? (
          <p style={{ color: C.muted, fontSize: 14, padding: '48px 0', textAlign: 'center' }}>
            {emptyMessage || 'Nothing here yet.'}
          </p>
        )
        : (
          <>
          {showUndated && undated.length > 0 && (
            <UndatedSection
              items={undated}
              favourites={favorites}
              onToggleFavourite={toggleFavorite}
              onOpen={setOpen}
            />
          )}
          <TimelineGrid
            buckets={buckets}
            params={params}
            selected={selected}
            onSelectionChange={setSelected}
            selectionMode={selectionMode}
            onRequestSelectionMode={() => setSelectionMode(true)}
            favourites={favorites}
            onToggleFavourite={toggleFavorite}
            versions={versions}
            onOrderedChange={setOrdered}
            onOpen={setOpen}
          />
          </>
        )}

      {albumFor && (
        <AlbumPicker paths={albumFor} onClose={() => setAlbumFor(null)} />
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
          onAddToAlbum={item => setAlbumFor([item.path])}
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
