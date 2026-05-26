import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getPhotos } from '../lib/api'
import { isVideo, mediaUrl } from '../lib/media'
import { Media } from '../components/new/Media'
import { MediaLightbox } from '../components/new/MediaLightbox'
import { MediaDetail } from '../components/new/MediaDetail'

const PAGE_SIZE = 48

export function PersonGallery() {
  const { person } = useOutletContext()
  const [all, setAll] = useState(null)
  const [shown, setShown] = useState(PAGE_SIZE)
  const [viewer, setViewer] = useState(null)
  const sentinelRef = useRef(null)

  useEffect(() => {
    setAll(null)
    setShown(PAGE_SIZE)
    getPhotos(person.id).then(setAll).catch(() => setAll([]))
  }, [person.id])

  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setShown(n => n + PAGE_SIZE)
    }, { rootMargin: '200px' })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [all])

  if (all === null) return <p className="text-[13px] text-white/30">Loading…</p>
  if (all.length === 0) return <p className="text-[13px] text-white/30">No photos yet.</p>

  const visible = all.slice(0, shown)
  const items = all.map(path => ({
    path,
    url: mediaUrl(path),
    thumbnail_url: `/api/media/thumb/${path.replace(/^archive\//, '')}`,
    is_video: isVideo(path),
  }))

  return (
    <div>
      <p className="mb-3 text-[12px] text-white/25">{all.length.toLocaleString()} photos</p>
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-6 md:grid-cols-8">
        {visible.map((path, i) => (
          <div key={i} className="aspect-square">
            <Media
              thumb={`/api/media/thumb/${path.replace(/^archive\//, '')}`}
              isVideo={isVideo(path)}
              onClick={() => setViewer(i)}
            />
          </div>
        ))}
      </div>
      {shown < all.length && <div ref={sentinelRef} className="h-8" />}

      {viewer !== null && (
        <MediaLightbox
          items={items}
          initialIndex={viewer}
          onClose={() => setViewer(null)}
          onNeedMore={() => setShown(n => Math.min(n + PAGE_SIZE, all.length))}
          renderDetail={(it, ctx, v) => <MediaDetail key={`${it.path}-${v}`} item={it} ctx={ctx} />}
        />
      )}
    </div>
  )
}
