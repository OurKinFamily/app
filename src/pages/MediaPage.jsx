import { useState, useEffect, useRef, useCallback } from 'react'

const LIMIT = 48

function PhotoTile({ photo }) {
  const [loaded, setLoaded] = useState(false)
  const bg = photo.dominant_color || '#111'

  return (
    <div
      className="relative aspect-square overflow-hidden rounded-sm"
      style={{ background: bg }}
    >
      <img
        src={photo.url}
        alt={photo.filename}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      {photo.is_video && (
        <div className="absolute bottom-1.5 right-1.5 bg-black/60 rounded px-1 py-0.5 text-[10px] text-white/70 leading-none">
          ▶
        </div>
      )}
    </div>
  )
}

export function MediaPage() {
  const [photos, setPhotos]     = useState([])
  const [offset, setOffset]     = useState(0)
  const [hasMore, setHasMore]   = useState(true)
  const [loading, setLoading]   = useState(false)
  const sentinelRef             = useRef(null)
  const observerRef             = useRef(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/gallery?limit=${LIMIT}&offset=${offset}`)
      const data = await res.json()
      setPhotos(prev => [...prev, ...data.photos])
      setOffset(prev => prev + data.photos.length)
      setHasMore(data.has_more)
    } catch (e) {
      console.error('Failed to load media', e)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, offset])

  // Initial load
  useEffect(() => { loadMore() }, [])

  // Infinite scroll sentinel
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '400px' }
    )
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [loadMore])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Media</h1>
        {photos.length > 0 && (
          <span className="text-[12px] text-white/25">{photos.length.toLocaleString()} loaded</span>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1">
        {photos.map(photo => (
          <PhotoTile key={photo.path} photo={photo} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-16 flex items-center justify-center">
        {loading && (
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
