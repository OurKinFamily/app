import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Horizontal strip of one representative photo per age bucket, baby
// through seventies+. Buckets with no photos drop out. Each tile shows
// the photo + an age caption underneath. Clicking opens the photo in
// the gallery lightbox.
//
// Data shape (from /api/people/{id}/life-stages):
//   { buckets: [{ bucket, age_text, path, url, thumb_url, is_video, count }] }

export function LifeStagesStrip({ personId }) {
  const navigate = useNavigate()
  const [buckets, setBuckets] = useState(null)
  const scrollRef = useRef(null)

  // Vertical mouse-wheel → horizontal scroll. Without this, desktop users
  // have no scroll affordance once the scrollbar is hidden.
  const onWheel = e => {
    if (e.deltaY === 0) return
    scrollRef.current.scrollLeft += e.deltaY
    e.preventDefault()
  }

  useEffect(() => {
    if (!personId) return
    let alive = true
    fetch(`/api/people/${personId}/life-stages`)
      .then(r => (r.ok ? r.json() : { buckets: [] }))
      .then(d => { if (alive) setBuckets(d.buckets || []) })
      .catch(() => { if (alive) setBuckets([]) })
    return () => { alive = false }
  }, [personId])

  if (buckets === null || buckets.length === 0) return null

  return (
    <div className="mb-8">
      <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Through the years</p>
      <div
        ref={scrollRef}
        onWheel={onWheel}
        className="-mx-1 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {buckets.map(b => (
          <button
            key={b.bucket}
            type="button"
            onClick={() => navigate(`/gallery/photo/${b.path}`)}
            className="group flex shrink-0 flex-col items-center gap-1.5 pb-3"
            title={`${b.bucket} · ${b.count} photo${b.count === 1 ? '' : 's'}`}
          >
            <div className="relative h-24 w-24">
              <div className="h-full w-full overflow-hidden rounded-lg ring-1 ring-white/10 transition-all group-hover:ring-white/30">
                <img
                  src={b.thumb_url}
                  alt={b.age_text}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              {b.crop_url && (
                <img
                  src={b.crop_url}
                  alt=""
                  loading="lazy"
                  className="absolute -bottom-3 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full object-cover ring-2 ring-black/80"
                />
              )}
            </div>
            <span className="mt-1 text-[11px] text-white/55">{b.age_text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
