import { useEffect, useState } from 'react'
import { MediaTile } from '../ui/MediaTile'
import { mediaTileProps, formatDuration } from '../ui/mediaTileProps'
import { C } from '../ui/tokens'

/** One photo and one video, so each tile can be looked at on its own. */
export function MediaTileDemo() {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [opened, setOpened] = useState(null)
  const [favourites, setFavourites] = useState(() => new Set())

  useEffect(() => {
    // Grab a batch and pick one of each rather than assuming the first few
    // happen to include a video.
    fetch('/api/gallery?limit=60')
      .then(r => (r.ok ? r.json() : { media: [] }))
      .then(d => {
        const all = d.media || []
        const photo = all.find(m => !m.is_video)
        const video = all.find(m => m.is_video)
        setItems([photo, video].filter(Boolean))
      })
      .catch(() => {})
  }, [])

  const fav = path => setFavourites(prev => {
    const next = new Set(prev)
    next.has(path) ? next.delete(path) : next.add(path)
    return next
  })

  const toggle = path => setSelected(prev => {
    const next = new Set(prev)
    next.has(path) ? next.delete(path) : next.add(path)
    return next
  })

  if (!items.length) {
    return <div style={{ fontSize: 13, color: C.muted }}>Loading…</div>
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 24 }}>
        {items.map(it => (
          <div key={it.path}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
              {it.is_video ? 'Video' : 'Photo'}
            </div>
            {/* A fixed box, since the grid isn't built yet — it will be the
                thing that works out each tile's width from the aspect ratio. */}
            <div style={{ width: 260, height: 190 }}>
              <MediaTile
                {...mediaTileProps(it)}
                selected={selected.has(it.path)}
                onClick={() => setOpened(it.filename)}
              >
                <MediaTile.Top justify="space-between">
                  {selected.has(it.path)
                    ? <MediaTile.Checkbox checked onChange={() => toggle(it.path)} />
                    : <MediaTile.OnHover>
                        <MediaTile.Checkbox onChange={() => toggle(it.path)} />
                      </MediaTile.OnHover>}
                  {/* A favourited heart stays visible; an empty one only
                      appears on hover. */}
                  {favourites.has(it.path)
                    ? <MediaTile.Favourite favourited onChange={() => fav(it.path)} />
                    : <MediaTile.OnHover>
                        <MediaTile.Favourite onChange={() => fav(it.path)} />
                      </MediaTile.OnHover>}
                </MediaTile.Top>
                {it.is_video && formatDuration(it.duration) && (
                  <MediaTile.Bottom justify="flex-end">
                    <span style={{
                      color: '#fff', fontSize: 12, fontWeight: 500,
                      textShadow: '0 1px 2px rgba(0,0,0,.6)',
                    }}>
                      {formatDuration(it.duration)}
                    </span>
                  </MediaTile.Bottom>
                )}
              </MediaTile>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 16 }}>
        Tab to a tile and press Enter or Space to activate it; ↑ reaches the controls,
        ← → move between them, Esc returns. The checkbox selects — separate from
        activating, because the tile only emits a click and the caller decides what it
        means. {opened ? `Last activated: ${opened}` : ''}
      </p>
    </>
  )
}
