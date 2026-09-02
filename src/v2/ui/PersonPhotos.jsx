import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MediaGrid } from './MediaGrid'
import { MediaDetail } from './MediaDetail'
import { LoadingDots } from './LoadingDots'
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

const PAGE = 120

export function PersonPhotos({ personId }) {
  const [items, setItems] = useState(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const [openPath, setOpenPath] = useState(null)
  const [patched, setPatched] = useState({})
  const [versions, setVersions] = useState(() => new Map())
  const { favs: favorites, toggle: toggleFavorite } = useFavorites()

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
        <Link
          to={`/v2/faces/similar?person_id=${personId}`}
          title="Look for more of them across the archive"
          style={{ fontSize: 12.5, color: C.activeText, textDecoration: 'none' }}
        >
          Find more →
        </Link>
      </div>

      <MediaGrid
        items={shown}
        favourites={favorites}
        onToggleFavourite={toggleFavorite}
        onOpen={item => setOpenPath(item.path)}
        versions={versions}
        showUndatedSection={false}
      />

      {items.length < total && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
          {busy ? <LoadingDots /> : (
            <button type="button" onClick={more} style={{
              height: 34, padding: '0 16px', borderRadius: 17, fontSize: 13,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.text, cursor: 'pointer',
            }}>
              Show more ({(total - items.length).toLocaleString()} left)
            </button>
          )}
        </div>
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
          onRotate={actions.rotate}
          onCrop={actions.crop}
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
