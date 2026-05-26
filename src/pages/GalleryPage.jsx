import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGallery } from '../lib/useGallery'
import { MediaGallery } from '../components/new/MediaGallery'

export function GalleryPage() {
  const { media, loading, loadMore } = useGallery()
  const navigate = useNavigate()
  const sentinelRef = useRef(null)

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { rootMargin: '600px' })
    if (sentinelRef.current) obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [loadMore])

  const open = item => navigate(`/gallery/photo/${item.path}`, { state: { items: media } })

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-semibold text-white">Gallery</h1>

      {media.length > 0 && (
        <p className="mb-3 text-[12px] text-white/25">{media.length.toLocaleString()} loaded</p>
      )}

      <MediaGallery items={media} onSelect={open} />

      <div ref={sentinelRef} className="flex h-16 items-center justify-center">
        {loading && (
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/20"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
