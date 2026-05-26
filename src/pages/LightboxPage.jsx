import { useMemo } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useFavorites } from '../lib/useFavorites'
import { MediaLightbox } from '../components/new/MediaLightbox'
import { MediaDetail } from '../components/new/MediaDetail'

// Renders as the gallery's nested route so GalleryPage stays mounted underneath
// (scroll position + loaded pages survive). Reads media from the outlet context.
// If the target photo isn't in the loaded gallery yet (direct URL visit), falls
// back to a single-item array so the lightbox opens immediately — no paging cascade.
export function LightboxPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { media, hasMore, loadMore } = useOutletContext()
  const { favs, toggle: toggleFav } = useFavorites()

  const photoPath = params['*'] || ''

  const { items, index } = useMemo(() => {
    const i = media.findIndex(m => m.path === photoPath)
    if (i >= 0) return { items: media, index: i }
    // Fallback: synthesize a minimal item from the URL so we can show this photo
    // without paging through the entire gallery to find it.
    const stripped = photoPath.replace(/^archive\//, '')
    const single = {
      path: photoPath,
      url: `/api/media/${photoPath}`,
      thumbnail_url: `/api/media/thumb/${stripped}`,
    }
    return { items: [single], index: 0 }
  }, [media, photoPath])

  const close = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/gallery')
  }
  const onNav = item => navigate(`../photo/${item.path}`, { replace: true })

  return (
    <MediaLightbox
      items={items}
      initialIndex={index}
      onClose={close}
      onNavigate={onNav}
      onNeedMore={hasMore ? loadMore : undefined}
      favorites={favs}
      onFavorite={toggleFav}
      onRotate={(it, deg) => console.log('rotate (mock — needs API)', it.path, deg)}
      onAlbum={it => console.log('add to album (mock)', it.path)}
      onDownload={it => console.log('download (mock)', it.path)}
      onDelete={() => { console.log('delete (mock)'); close() }}
      renderDetail={(it, ctx) => <MediaDetail key={it.path} item={it} ctx={ctx} />}
    />
  )
}
