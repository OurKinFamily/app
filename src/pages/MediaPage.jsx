import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PhotoViewer } from '../components/PhotoViewer'

const LIMIT        = 48
const ROW_HEIGHT   = 240
const GAP          = 4
const DEFAULT_ASPECT = 4 / 3

// Pack photos into rows that fill containerWidth at ROW_HEIGHT target.
// Returns [{ photos: [{...photo, aspect, idx}], height, last }]
function computeRows(photos, containerWidth) {
  if (!containerWidth || !photos.length) return []

  const rows    = []
  let current   = []
  let aspectSum = 0

  photos.forEach((photo, idx) => {
    const aspect = photo.width && photo.height ? photo.width / photo.height : DEFAULT_ASPECT
    current.push({ ...photo, aspect, idx })
    aspectSum += aspect

    const gaps      = (current.length - 1) * GAP
    const projected = aspectSum * ROW_HEIGHT + gaps

    if (projected >= containerWidth) {
      const rowHeight = (containerWidth - gaps) / aspectSum
      rows.push({ photos: current, height: Math.round(rowHeight) })
      current   = []
      aspectSum = 0
    }
  })

  if (current.length) {
    rows.push({ photos: current, height: ROW_HEIGHT, last: true })
  }

  return rows
}

function PhotoTile({ photo, rowHeight, last, onClick }) {
  const [loaded, setLoaded] = useState(false)
  const width = last ? Math.round(photo.aspect * rowHeight) : undefined

  return (
    <div
      className="relative overflow-hidden cursor-pointer group flex-shrink-0"
      style={{
        flex:       last ? `0 0 ${width}px` : `${photo.aspect} 1 0`,
        height:     rowHeight,
        background: photo.dominant_color || '#111',
      }}
      onClick={onClick}
    >
      <img
        src={photo.thumbnail_url || photo.url}
        alt={photo.filename}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-85 ${loaded ? 'opacity-100' : 'opacity-0'}`}
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
  const [photos, setPhotos]             = useState([])
  const [loading, setLoading]           = useState(false)
  const [viewerIndex, setViewerIndex]   = useState(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()

  const gridRef      = useRef(null)
  const sentinelRef  = useRef(null)
  const observerRef  = useRef(null)
  const loadingRef   = useRef(false)
  const hasMoreRef   = useRef(true)
  const offsetRef    = useRef(0)
  const photosRef    = useRef([])

  // Track container width for layout
  useEffect(() => {
    if (!gridRef.current) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(Math.floor(entries[0].contentRect.width))
    })
    ro.observe(gridRef.current)
    return () => ro.disconnect()
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const res   = await fetch(`/api/gallery?limit=${LIMIT}&offset=${offsetRef.current}`)
      const data  = await res.json()
      const batch = Array.isArray(data.photos) ? data.photos : []
      photosRef.current = [...photosRef.current, ...batch]
      setPhotos(photosRef.current)
      offsetRef.current  += batch.length
      hasMoreRef.current  = data.has_more
    } catch (e) {
      console.error('Failed to load media', e)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMore() }, [])

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '600px' }
    )
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [loadMore])

  // Open viewer from ?photo= param — keep loading until found
  useEffect(() => {
    const param = searchParams.get('photo')
    if (!param || viewerIndex !== null) return
    const idx = photos.findIndex(p => p.path === param)
    if (idx >= 0) {
      setViewerIndex(idx)
    } else if (hasMoreRef.current) {
      loadMore()
    }
  }, [photos.length])

  const openViewer = useCallback((index) => {
    setViewerIndex(index)
    setSearchParams({ photo: photosRef.current[index].path }, { replace: false })
  }, [setSearchParams])

  const handleNavigate = useCallback((photo) => {
    setSearchParams({ photo: photo.path }, { replace: true })
  }, [setSearchParams])

  const handleClose = useCallback(() => {
    setViewerIndex(null)
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const rows = computeRows(photos, containerWidth)

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-white">Media</h1>
          {photos.length > 0 && (
            <span className="text-[12px] text-white/25">{photos.length.toLocaleString()} loaded</span>
          )}
        </div>

        <div ref={gridRef} className="w-full">
          <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
            {rows.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: GAP, height: row.height }}>
                {row.photos.map(photo => (
                  <PhotoTile
                    key={photo.path}
                    photo={photo}
                    rowHeight={row.height}
                    last={row.last}
                    onClick={() => openViewer(photo.idx)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div ref={sentinelRef} className="h-16 flex items-center justify-center mt-4">
          {loading && (
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          initialIndex={viewerIndex}
          onClose={handleClose}
          onNavigate={handleNavigate}
          onNeedMore={loadMore}
        />
      )}
    </>
  )
}
