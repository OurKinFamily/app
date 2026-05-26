import { useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useGallery } from '../lib/useGallery'
import { useFavorites } from '../lib/useFavorites'
import { MediaLightbox } from '../components/new/MediaLightbox'
import { MediaDetail } from '../components/new/MediaDetail'

// Its own route so the gallery DOM doesn't render behind the lightbox.
// Seeded from location.state when arriving from /gallery for instant open.
export function LightboxPage() {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const photoPath = params['*'] || ''
  const stateItems = location.state?.items
  const seed = stateItems ? { items: stateItems, offset: stateItems.length } : undefined
  const { media, hasMore, loadMore } = useGallery({}, { seed })
  const { favs, toggle: toggleFav } = useFavorites()

  const index = media.findIndex(m => m.path === photoPath)

  useEffect(() => {
    if (index < 0 && hasMore) loadMore()
  }, [index, hasMore, loadMore])

  if (index < 0) {
    return <div className="flex h-screen items-center justify-center text-white/30">Loading…</div>
  }

  const close = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/gallery')
  }
  const onNav = item => navigate(`/gallery/photo/${item.path}`, { replace: true, state: { items: media } })

  return (
    <MediaLightbox
      items={media}
      initialIndex={index}
      onClose={close}
      onNavigate={onNav}
      onNeedMore={loadMore}
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
