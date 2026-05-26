import { useFavorites } from '../lib/useFavorites'
import { MediaLightbox } from './MediaLightbox'
import { MediaDetail } from './MediaDetail'

// Standard photo lightbox: MediaLightbox + favorites + the usual mocked actions
// (rotate / album / download / delete) + MediaDetail in the detail slot.
// Use this anywhere you want the same lightbox UX as the main gallery.
export function PhotoLightbox({ items, initialIndex = 0, onClose, onNavigate, onNeedMore, title }) {
  const { favs, toggle: toggleFav } = useFavorites()
  return (
    <MediaLightbox
      items={items}
      initialIndex={initialIndex}
      title={title}
      favorites={favs}
      onFavorite={toggleFav}
      onRotate={(it, deg) => console.log('rotate (mock — needs API)', it.path, deg)}
      onAlbum={it => console.log('add to album (mock)', it.path)}
      onDownload={it => console.log('download (mock)', it.path)}
      onDelete={() => { console.log('delete (mock)'); onClose?.() }}
      onClose={onClose}
      onNavigate={onNavigate}
      onNeedMore={onNeedMore}
      renderDetail={(it, ctx, v) => <MediaDetail key={`${it.path}-${v}`} item={it} ctx={ctx} />}
    />
  )
}
