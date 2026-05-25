import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PhotoViewer } from './PhotoViewer'

const LIMIT         = 48
const ROW_HEIGHT    = 240
const GAP           = 4
const DEFAULT_ASPECT = 4 / 3

function computeRows(photos, containerWidth) {
  if (!containerWidth || !photos.length) return []
  const rows = []
  let current = [], aspectSum = 0
  photos.forEach((photo, idx) => {
    const aspect = photo.width && photo.height ? photo.width / photo.height : DEFAULT_ASPECT
    current.push({ ...photo, aspect, idx })
    aspectSum += aspect
    const gaps = (current.length - 1) * GAP
    if (aspectSum * ROW_HEIGHT + gaps >= containerWidth) {
      rows.push({ photos: current, height: Math.round((containerWidth - gaps) / aspectSum) })
      current = []; aspectSum = 0
    }
  })
  if (current.length) rows.push({ photos: current, height: ROW_HEIGHT, last: true })
  return rows
}

function PhotoTile({ photo, rowHeight, last, onClick }) {
  const [loaded, setLoaded] = useState(false)
  const width = last ? Math.round(photo.aspect * rowHeight) : undefined
  return (
    <div
      className="relative overflow-hidden cursor-pointer group flex-shrink-0"
      style={{ flex: last ? `0 0 ${width}px` : `${photo.aspect} 1 0`, height: rowHeight, background: photo.dominant_color || '#111' }}
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
        <div className="absolute bottom-1.5 right-1.5 bg-black/60 rounded px-1 py-0.5 text-[10px] text-white/70 leading-none">▶</div>
      )}
    </div>
  )
}

// params: object of extra query params passed to /api/gallery
// disabled: don't fetch (e.g. no people selected yet)
export function GalleryGrid({ params = {}, disabled = false }) {
  const [photos, setPhotos]           = useState([])
  const [loading, setLoading]         = useState(false)
  const [viewerIndex, setViewerIndex] = useState(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()

  const gridRef     = useRef(null)
  const sentinelRef = useRef(null)
  const observerRef = useRef(null)
  const loadingRef  = useRef(false)
  const hasMoreRef  = useRef(true)
  const offsetRef   = useRef(0)
  const photosRef   = useRef([])
  const paramsKey   = JSON.stringify(params)

  useEffect(() => {
    if (!gridRef.current) return
    const ro = new ResizeObserver(e => setContainerWidth(Math.floor(e[0].contentRect.width)))
    ro.observe(gridRef.current)
    return () => ro.disconnect()
  }, [])

  const buildUrl = useCallback((offset) => {
    const qs = new URLSearchParams({ limit: LIMIT, offset, ...params }).toString()
    return `/api/gallery?${qs}`
  }, [paramsKey])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current || disabled) return
    loadingRef.current = true
    setLoading(true)
    try {
      const res  = await fetch(buildUrl(offsetRef.current))
      const data = await res.json()
      const batch = Array.isArray(data.photos) ? data.photos : []
      photosRef.current = [...photosRef.current, ...batch]
      setPhotos([...photosRef.current])
      offsetRef.current += batch.length
      hasMoreRef.current = data.has_more
    } catch (e) {
      console.error('Gallery fetch failed', e)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [buildUrl, disabled])

  // Reset + reload when params change
  useEffect(() => {
    photosRef.current = []
    offsetRef.current = 0
    hasMoreRef.current = true
    loadingRef.current = false
    setPhotos([])
    setViewerIndex(null)
    if (!disabled) loadMore()
  }, [paramsKey, disabled])

  // Infinite scroll sentinel
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '600px' }
    )
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [loadMore])

  // Deep link: ?photo= — keep loading pages until found
  useEffect(() => {
    const param = searchParams.get('photo')
    if (!param || viewerIndex !== null) return
    const idx = photos.findIndex(p => p.path === param)
    if (idx >= 0) setViewerIndex(idx)
    else if (hasMoreRef.current) loadMore()
  }, [photos.length])

  const openViewer = useCallback((index) => {
    setViewerIndex(index)
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('photo', photosRef.current[index].path); return n }, { replace: false })
  }, [setSearchParams])

  const handleNavigate = useCallback((photo) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('photo', photo.path); return n }, { replace: true })
  }, [setSearchParams])

  const handleClose = useCallback(() => {
    setViewerIndex(null)
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('photo'); return n }, { replace: true })
  }, [setSearchParams])

  const rows = computeRows(photos, containerWidth)

  return (
    <>
      {photos.length > 0 && (
        <p className="text-[12px] text-white/25 mb-4">{photos.length.toLocaleString()} loaded</p>
      )}

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
