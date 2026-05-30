import { useMemo, useState } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useFavorites } from '../lib/useFavorites'
import { deleteMedia } from '../lib/api'
import { MediaLightbox } from '../components/MediaLightbox'
import { MediaDetail } from '../components/MediaDetail'
import { AlbumPicker } from '../components/AlbumPicker'
import { mediaUrl, thumbUrl } from '../lib/media'

// Renders as the gallery's nested route so GalleryPage stays mounted underneath
// (scroll position + loaded pages survive). Reads media from the outlet context.
// If the target photo isn't in the loaded gallery yet (direct URL visit), falls
// back to a single-item array so the lightbox opens immediately — no paging cascade.
export function LightboxPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { media, hasMore, loadMore, removeItem } = useOutletContext()
  const { favs, toggle: toggleFav } = useFavorites()
  const [albumFor, setAlbumFor] = useState(null)

  const photoPath = params['*'] || ''

  const { items, index } = useMemo(() => {
    const i = media.findIndex(m => m.path === photoPath)
    if (i >= 0) return { items: media, index: i }
    // Fallback: synthesize a minimal item from the URL so we can show this photo
    // without paging through the entire gallery to find it.
    const single = {
      path: photoPath,
      url: mediaUrl(photoPath),
      thumbnail_url: thumbUrl(photoPath),
    }
    return { items: [single], index: 0 }
  }, [media, photoPath])

  const close = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/gallery')
  }
  const onNav = item => navigate(`../photo/${item.path}`, { replace: true })

  return (
    <>
      <MediaLightbox
        // Remount when items transitions from the single-item fallback to the loaded
        // gallery list, so initialIndex actually points at the right photo.
        key={items.length > 1 ? `list-${photoPath}` : `single-${photoPath}`}
        items={items}
        initialIndex={index}
        onClose={close}
        onNavigate={onNav}
        onNeedMore={hasMore ? loadMore : undefined}
        favorites={favs}
        onFavorite={toggleFav}
        onRotate={(it, deg) => console.log('rotate (mock — needs API)', it.path, deg)}
        onAlbum={it => setAlbumFor(it.path)}
        onMosaic={it => navigate(`/admin/mosaic?source=${encodeURIComponent(it.path)}`)}
        onDownload={it => console.log('download (mock)', it.path)}
        onDelete={async it => {
          try {
            await deleteMedia(it.path)
          } catch (e) {
            alert('Failed to delete: ' + e.message)
            return
          }
          removeItem?.(it.path)
          close()
        }}
        renderDetail={(it, ctx, v) => <MediaDetail key={`${it.path}-${v}`} item={it} ctx={ctx} />}
      />
      {albumFor && (
        <AlbumPicker paths={[albumFor]} onClose={() => setAlbumFor(null)} />
      )}
    </>
  )
}
