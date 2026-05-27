import { useEffect, useState } from 'react'
import { Container } from '../components/Container'
import { Tag } from '../components/Tag'
import { Media } from '../components/Media'
import { MediaLightbox } from '../components/MediaLightbox'
import { MediaDetail } from '../components/MediaDetail'
import { useFavorites } from '../lib/useFavorites'

const PAGE_SIZE = 100

export function FavoritesPage() {
  const [items, setItems] = useState(null)
  const [total, setTotal] = useState(0)
  const [viewer, setViewer] = useState(null)
  const { favs, toggle } = useFavorites()

  useEffect(() => {
    let alive = true
    fetch(`/api/me/favorites?limit=${PAGE_SIZE}`)
      .then(r => r.ok ? r.json() : { items: [], total: 0 })
      .then(d => {
        if (!alive) return
        setItems(d.items || [])
        setTotal(d.total || 0)
      })
      .catch(() => alive && setItems([]))
    return () => { alive = false }
  }, [])

  // Drop locally any item the user un-favorites without a full refetch.
  const visible = items?.filter(it => favs.has(it.path)) || []

  return (
    <Container className="py-6">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-lg font-medium text-white/80">Favorites</h1>
        <Tag tone="red">{visible.length.toLocaleString()}{total > visible.length ? ` of ${total}` : ''}</Tag>
      </div>

      {items === null && <p className="text-[13px] text-white/30">Loading…</p>}
      {items !== null && visible.length === 0 && (
        <p className="text-[13px] text-white/30">No favorites yet. Tap the heart on any photo in the lightbox.</p>
      )}

      {visible.length > 0 && (
        <div className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]">
          {visible.map((it, i) => (
            <div key={it.path} className="aspect-square">
              <Media
                thumb={it.thumbnail_url}
                isVideo={it.is_video}
                color={it.dominant_color}
                favorited
                onFavorite={() => toggle(it)}
                onClick={() => setViewer(i)}
              />
            </div>
          ))}
        </div>
      )}

      {viewer !== null && visible[viewer] && (
        <MediaLightbox
          items={visible}
          initialIndex={viewer}
          favorites={favs}
          onFavorite={toggle}
          onClose={() => setViewer(null)}
          renderDetail={(it, ctx, v) => <MediaDetail key={`${it.path}-${v}`} item={it} ctx={ctx} />}
        />
      )}
    </Container>
  )
}
