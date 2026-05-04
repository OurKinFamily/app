import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getPhotos } from '../lib/api'

const PAGE_SIZE = 48

export function PersonGallery() {
  const { person } = useOutletContext()
  const [all, setAll]     = useState(null)
  const [shown, setShown] = useState(PAGE_SIZE)
  const sentinelRef       = useRef(null)

  useEffect(() => {
    setAll(null)
    setShown(PAGE_SIZE)
    getPhotos(person.id).then(setAll)
  }, [person.id])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setShown(n => n + PAGE_SIZE) },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [all])

  if (all === null) return <div className="text-white/40 text-sm">Loading…</div>
  if (all.length === 0) return <div className="text-white/40 text-sm">No photos yet.</div>

  const visible = all.slice(0, shown)

  return (
    <div>
      <p className="text-white/40 text-sm mb-4">{all.length.toLocaleString()} photos</p>
      <div className="grid grid-cols-4 gap-1">
        {visible.map((path, i) => (
          <img
            key={i}
            src={`/api/media/${path}`}
            alt=""
            className="w-full aspect-square object-cover rounded"
            loading="lazy"
          />
        ))}
      </div>
      {shown < all.length && <div ref={sentinelRef} className="h-8" />}
    </div>
  )
}
