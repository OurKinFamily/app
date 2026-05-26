import { useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useFavorites } from '../lib/useFavorites'
import { MediaLightbox } from '../components/new/MediaLightbox'
import { MediaDetail } from '../components/new/MediaDetail'

// Renders as the gallery's nested route so GalleryPage stays mounted underneath
// (scroll position + loaded pages survive). Reads media from the outlet context.
export function LightboxPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { media, hasMore, loadMore } = useOutletContext()
  const { favs, toggle: toggleFav } = useFavorites()

  const photoPath = params['*'] || ''
  const index = media.findIndex(m => m.path === photoPath)

  useEffect(() => {
    if (index < 0 && hasMore) loadMore()
  }, [index, hasMore, loadMore])

  if (index < 0) {
    return <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black text-white/30">Loading…</div>
  }

  const close = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/gallery')
  }
  const onNav = item => navigate(`/gallery/photo/${item.path}`, { replace: true })

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
