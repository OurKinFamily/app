import { useEffect, useState } from 'react'
import { Album, Check, Lock, Plus } from 'lucide-react'
import { NewAlbumDialog } from './NewAlbumDialog'
import { LoadingDots } from './LoadingDots'
import { C } from './tokens'

/**
 * Put photographs in an album.
 *
 * Takes paths rather than items, because the two callers have different
 * things in hand: the lightbox has one photograph, the selection header has
 * forty. One list either way.
 *
 * Adding does not close the dialog. Filing a photograph in two albums is
 * ordinary — a holiday and a person — and a dialog that shuts after the first
 * makes you reopen it to say the obvious second thing. It shows a tick
 * instead, and closing is the reader's decision.
 */
export function AlbumPicker({ paths, onClose }) {
  const [albums, setAlbums] = useState(null)
  const [added, setAdded] = useState(() => new Set())
  const [busy, setBusy] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/albums/')
      .then(r => (r.ok ? r.json() : []))
      .then(rows => setAlbums(Array.isArray(rows) ? rows : []))
      .catch(() => setAlbums([]))
  }, [])

  async function addTo(album) {
    if (busy) return
    setBusy(album.id)
    setError(null)
    try {
      const res = await fetch(`/api/albums/${album.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setAdded(cur => new Set(cur).add(album.id))
    } catch {
      setError(`Could not add to ${album.name}.`)
    } finally {
      setBusy(null)
    }
  }

  const count = paths.length

  return (
    <>
      <div
        role="presentation"
        onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1300,
          display: 'grid', placeItems: 'center',
          background: 'rgba(32,33,36,.5)',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add to album"
          onKeyDown={e => { if (e.key === 'Escape') onClose?.() }}
          style={{
            width: 'min(420px, calc(100vw - 32px))',
            maxHeight: 'min(70vh, 560px)',
            background: C.bg, borderRadius: 14,
            boxShadow: '0 8px 40px rgba(0,0,0,.25)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          <div style={{ padding: '18px 20px 12px' }}>
            <h2 style={{ fontSize: 17, fontWeight: 500, margin: 0 }}>
              Add to album
            </h2>
            <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
              {count === 1 ? 'One photo' : `${count} photos`}
            </p>
          </div>

          <div style={{ overflowY: 'auto', padding: '0 8px 8px', flex: 1 }}>
            <button
              type="button"
              onClick={() => setCreating(true)}
              style={{ ...rowStyle, color: C.activeText }}
            >
              <span style={{ ...iconBox, background: C.activeBg, color: C.activeText }}>
                <Plus size={16} />
              </span>
              New album
            </button>

            {albums === null && <LoadingDots />}

            {albums?.length === 0 && (
              <p style={{ fontSize: 13, color: C.muted, padding: '12px 12px 16px', margin: 0 }}>
                No albums yet.
              </p>
            )}

            {albums?.map(a => {
              const done = added.has(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => addTo(a)}
                  disabled={busy === a.id}
                  style={rowStyle}
                >
                  <span style={iconBox}>
                    {a.is_private ? <Lock size={15} /> : <Album size={15} />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: 'block', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {a.name}
                    </span>
                    <span style={{ fontSize: 11, color: C.muted }}>
                      {a.item_count} {a.item_count === 1 ? 'photo' : 'photos'}
                    </span>
                  </span>
                  {done && <Check size={16} color={C.activeText} />}
                </button>
              )
            })}
          </div>

          {error && (
            <p style={{ color: '#c5221f', fontSize: 12, margin: 0, padding: '0 20px 8px' }}>
              {error}
            </p>
          )}

          <div style={{
            display: 'flex', justifyContent: 'flex-end',
            padding: '10px 16px', borderTop: `1px solid ${C.border}`,
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 34, padding: '0 16px', borderRadius: 17, fontSize: 13,
                border: 0, background: 'transparent', color: C.activeText,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {creating && (
        <NewAlbumDialog
          onClose={() => setCreating(false)}
          onCreated={async id => {
            // Straight into the album that was just made for them: nobody
            // creates an album from here and then means not to use it.
            setCreating(false)
            const res = await fetch('/api/albums/')
            const rows = res.ok ? await res.json() : []
            setAlbums(Array.isArray(rows) ? rows : [])
            const fresh = rows.find?.(a => a.id === id)
            if (fresh) addTo(fresh)
          }}
        />
      )}
    </>
  )
}

const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  width: '100%', padding: '10px 12px',
  border: 0, background: 'transparent', borderRadius: 10,
  font: 'inherit', fontSize: 13.5, color: C.text,
  textAlign: 'left', cursor: 'pointer',
}

const iconBox = {
  display: 'grid', placeItems: 'center',
  width: 34, height: 34, borderRadius: 8,
  background: C.hover, color: C.muted, flex: '0 0 auto',
}
