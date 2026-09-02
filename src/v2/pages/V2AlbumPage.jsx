import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMatch, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MediaGrid } from '../ui/MediaGrid'
import { MediaDetail } from '../ui/MediaDetail'
import { NewAlbumDialog } from '../ui/NewAlbumDialog'
import { LoadingDots } from '../ui/LoadingDots'
import { AlbumHeader } from '../ui/AlbumHeader'
import { useMediaActions } from '../lib/useMediaActions'
import { useFavorites } from '../../lib/useFavorites'
import { mediaUrl, thumbUrl } from '../../lib/media'
import { C } from '../ui/tokens'

/**
 * One album.
 *
 * Replaces the v1 page, which was written for a dark theme: on v2's white
 * ground its name and description were white text on white, so the page
 * appeared to contain nothing but two chips and a Delete button.
 *
 * The photographs are laid out by the same justified grid as the gallery, and
 * open into the same detail view at their own URL — an album is a different
 * set of photographs, not a different way of looking at one.
 */

export function V2AlbumPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [album, setAlbum] = useState(null)
  const [missing, setMissing] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [editing, setEditing] = useState(false)
  const [versions, setVersions] = useState(() => new Map())
  const [patched, setPatched] = useState({})
  const { favs: favorites, toggle: toggleFavorite } = useFavorites()

  const basePath = `/v2/albums/${id}`
  const match = useMatch(`${basePath}/photo/*`)
  const openPath = match?.params['*'] || null

  const load = useCallback(() => {
    fetch(`/api/albums/${id}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setAlbum)
      .catch(() => setMissing(true))
  }, [id])

  useEffect(() => { load() }, [load])

  // The album endpoint returns dimensions but no aspect and no media URL; the
  // grid packs rows by aspect and the detail view needs somewhere to fetch
  // from. Cheaper to derive both here than to widen the endpoint.
  const items = useMemo(() => (album?.items || []).map(it => ({
    ...it,
    url: mediaUrl(it.path),
    thumbnail_url: it.thumbnail_url || thumbUrl(it.path),
    aspect: it.width && it.height ? it.width / it.height : 1,
    ...patched[it.path],
  })), [album, patched])

  const open = openPath ? items.find(m => m.path === openPath) || {
    path: openPath,
    url: mediaUrl(openPath),
    thumbnail_url: thumbUrl(openPath),
    filename: openPath.split('/').pop(),
  } : null

  const setOpen = useCallback((item, { replace = false } = {}) => {
    if (item?.path) navigate(`${basePath}/photo/${item.path}`, { replace })
    else navigate(basePath)
  }, [navigate, basePath])

  const onVersion = useCallback((path, patch) => {
    setVersions(cur => new Map(cur).set(path, patch.version))
    setPatched(cur => ({ ...cur, [path]: patch }))
  }, [])

  const actions = useMediaActions({
    openPath,
    close: useCallback(() => setOpen(null), [setOpen]),
    onVersion,
  })

  const index = open ? items.findIndex(m => m.path === open.path) : -1
  const step = useCallback(delta => {
    const next = items[index + delta]
    if (next) setOpen(next, { replace: true })
  }, [items, index, setOpen])

  async function removeSelected() {
    // The endpoint takes one path at a time — adding is bulk, removing is not.
    // Fired together rather than in sequence: forty round trips one after the
    // other is a visible pause for something the reader thinks of as one act.
    await Promise.all([...selected].map(path =>
      fetch(`/api/albums/${id}/media?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      })))
    setSelected(new Set())
    setSelectionMode(false)
    load()
  }

  async function setCover(path) {
    await fetch(`/api/albums/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_path: path }),
    })
    load()
  }

  async function removeAlbum() {
    await fetch(`/api/albums/${id}`, { method: 'DELETE' })
    navigate('/v2/albums')
  }

  if (missing) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: C.muted }}>
        <p style={{ fontSize: 14 }}>That album is not here.</p>
        <button type="button" onClick={() => navigate('/v2/albums')} style={linkButton}>
          Back to albums
        </button>
      </div>
    )
  }

  if (!album) return <LoadingDots />

  return (
    <div>
      <button type="button" onClick={() => navigate('/v2/albums')} style={backButton}>
        <ArrowLeft size={15} /> Albums
      </button>

      <AlbumHeader
        album={album}
        selectedCount={selected.size}
        onEdit={() => setEditing(true)}
        onDelete={removeAlbum}
        onRemoveSelected={removeSelected}
        onClearSelection={() => { setSelected(new Set()); setSelectionMode(false) }}
        onSetCover={selected.size === 1 ? () => setCover([...selected][0]) : null}
      />

      {items.length === 0
        ? (
          <p style={{ color: C.muted, fontSize: 14, padding: '48px 0', textAlign: 'center' }}>
            Nothing in this album yet. Open a photograph and choose “Add to
            album”, or select several in the gallery and add them at once.
          </p>
        )
        : (
          <MediaGrid
            items={items}
            selected={selected}
            onSelectionChange={setSelected}
            selectionMode={selectionMode}
            onRequestSelectionMode={() => setSelectionMode(true)}
            favourites={favorites}
            onToggleFavourite={toggleFavorite}
            onOpen={setOpen}
            versions={versions}
            showUndatedSection={false}
          />
        )}

      {editing && (
        <NewAlbumDialog
          album={album}
          onClose={() => setEditing(false)}
          onCreated={() => load()}
        />
      )}

      {open && (
        <MediaDetail
          item={open}
          onClose={() => setOpen(null)}
          favourited={favorites?.has(open.path)}
          onToggleFavourite={toggleFavorite}
          onRedate={actions.redate}
          onRelocate={actions.relocate}
          onAssignFace={actions.assignFace}
          onCreatePerson={actions.createPerson}
          onDismissFace={actions.dismissFace}
          onRotate={actions.rotate}
          onDownload={actions.download}
          onDelete={actions.remove}
          hasPrev={index > 0}
          hasNext={index >= 0 && index < items.length - 1}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />
      )}
    </div>
  )
}

const backButton = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: 0, background: 'transparent', color: C.muted,
  fontSize: 13, cursor: 'pointer', padding: '4px 0', margin: '4px 0 0',
}

const linkButton = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 13, cursor: 'pointer', marginTop: 8,
}
