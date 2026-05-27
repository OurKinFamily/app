import { useState } from 'react'
import { useFavorites } from '../lib/useFavorites'
import { MediaLightbox } from './MediaLightbox'
import { MediaDetail } from './MediaDetail'
import { AlbumPicker } from './AlbumPicker'

// Standard photo lightbox: MediaLightbox + favorites + the usual actions
// (rotate / download / delete still mocked) + Album picker + MediaDetail.
// Use this anywhere you want the same lightbox UX as the main gallery.
export function PhotoLightbox({ items, initialIndex = 0, onClose, onNavigate, onNeedMore, onSetCover, currentCoverPath, title }) {
  const { favs, toggle: toggleFav } = useFavorites()
  const [albumFor, setAlbumFor] = useState(null)
  return (
    <>
      <MediaLightbox
        items={items}
        initialIndex={initialIndex}
        title={title}
        favorites={favs}
        onFavorite={toggleFav}
        onRotate={(it, deg) => console.log('rotate (mock — needs API)', it.path, deg)}
        onAlbum={it => setAlbumFor(it.path)}
        onDownload={it => console.log('download (mock)', it.path)}
        onDelete={async it => {
          const { deleteMedia } = await import('../lib/api')
          try { await deleteMedia(it.path) } catch (e) { alert('Failed: ' + e.message); return }
          onClose?.()
        }}
        onSetCover={onSetCover}
        currentCoverPath={currentCoverPath}
        onClose={onClose}
        onNavigate={onNavigate}
        onNeedMore={onNeedMore}
        renderDetail={(it, ctx, v) => <MediaDetail key={`${it.path}-${v}`} item={it} ctx={ctx} />}
      />
      {albumFor && (
        <AlbumPicker
          paths={[albumFor]}
          onClose={() => setAlbumFor(null)}
        />
      )}
    </>
  )
}
