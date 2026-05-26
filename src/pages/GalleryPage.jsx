import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGallery } from '../lib/useGallery'
import { useFavorites } from '../lib/useFavorites'
import { MediaGallery } from '../components/new/MediaGallery'

const ROW_MIN = 100   // small (more per row)
const ROW_MAX = 1200  // large (fewer per row)
const ROW_DEFAULT = 200
const STORAGE_KEY = 'gallery-row-height'

export function GalleryPage() {
  const { media, loading, loadMore } = useGallery()
  const { favs, toggle: toggleFav } = useFavorites()
  const navigate = useNavigate()
  const sentinelRef = useRef(null)
  const galleryRef = useRef(null)
  const pinchStart = useRef(null) // { dist, height }
  const rowHeightRef = useRef(ROW_DEFAULT)

  const [rowHeight, setRowHeight] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return stored >= ROW_MIN && stored <= ROW_MAX ? stored : ROW_DEFAULT
  })

  useEffect(() => {
    rowHeightRef.current = rowHeight
    localStorage.setItem(STORAGE_KEY, String(Math.round(rowHeight)))
  }, [rowHeight])

  // infinite scroll
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { rootMargin: '600px' })
    if (sentinelRef.current) obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [loadMore])

  // pinch-to-resize: override native zoom on the gallery only
  useEffect(() => {
    const el = galleryRef.current
    if (!el) return
    const dist = t => {
      const dx = t[0].clientX - t[1].clientX
      const dy = t[0].clientY - t[1].clientY
      return Math.hypot(dx, dy)
    }
    const onStart = e => {
      if (e.touches.length === 2) {
        pinchStart.current = { dist: dist(e.touches), height: rowHeightRef.current }
      }
    }
    const onMove = e => {
      if (e.touches.length === 2 && pinchStart.current) {
        e.preventDefault()
        const ratio = dist(e.touches) / pinchStart.current.dist
        const next = Math.max(ROW_MIN, Math.min(ROW_MAX, pinchStart.current.height * ratio))
        setRowHeight(next)
      }
    }
    const onEnd = () => { pinchStart.current = null }
    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  const open = item => navigate(`/gallery/photo/${item.path}`, { state: { items: media } })

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-semibold text-white">Gallery</h1>

      {media.length > 0 && (
        <p className="mb-3 text-[12px] text-white/25">{media.length.toLocaleString()} loaded</p>
      )}

      <div ref={galleryRef} style={{ touchAction: 'pan-x pan-y' }}>
        <MediaGallery items={media} rowHeight={rowHeight} favorites={favs} onFavorite={toggleFav} onSelect={open} />
      </div>

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
