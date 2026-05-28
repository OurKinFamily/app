import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Unlock, RefreshCw } from 'lucide-react'

// Horizontal strip of one representative photo per age bucket. Each tile
// is either:
//   - auto-picked (favorited+solo > solo > favorited > newest) — when
//     no LIFE_STAGE edge exists for that bucket; or
//   - LOCKED to a specific Media via a LIFE_STAGE edge.
// Tile actions on hover:
//   - 🔄 next candidate (local cycle, no write)
//   - 🔒 save / 🔓 unlock — persists / removes the LIFE_STAGE edge.

const SLOT = 96 // px — keep in sync with .h-24 / .w-24

export function LifeStagesStrip({ personId }) {
  const navigate = useNavigate()
  const [buckets, setBuckets] = useState(null)
  const scrollRef = useRef(null)

  const onWheel = e => {
    if (e.deltaY === 0) return
    scrollRef.current.scrollLeft += e.deltaY
    e.preventDefault()
  }

  const load = () => {
    fetch(`/api/people/${personId}/life-stages`)
      .then(r => (r.ok ? r.json() : { buckets: [] }))
      .then(d => setBuckets((d.buckets || []).map(b => ({ ...b, _cands: null, _i: 0 }))))
      .catch(() => setBuckets([]))
  }

  useEffect(() => {
    if (!personId) return
    setBuckets(null)
    load()
  }, [personId])

  const updateBucket = (idx, patch) => {
    setBuckets(prev => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
  }

  const cycle = async (idx) => {
    const b = buckets[idx]
    let cands = b._cands
    if (!cands) {
      const r = await fetch(`/api/people/${personId}/life-stages/${b.bucket}/candidates`)
      const d = r.ok ? await r.json() : { candidates: [] }
      cands = d.candidates
      if (!cands.length) return
    }
    if (cands.length <= 1) return
    // Advance past the current photo
    const curIdx = cands.findIndex(c => c.path === b.path)
    const next = cands[(Math.max(curIdx, 0) + 1) % cands.length]
    updateBucket(idx, {
      _cands: cands,
      _i: cands.indexOf(next),
      path: next.path,
      url: next.url,
      thumb_url: next.thumb_url,
      crop_url: next.crop_url,
      age_text: next.age_text,
      // moving off the locked photo doesn't unlock — that needs an explicit click,
      // but we mark `dirty` so the lock icon turns into "save current"
      dirty: b.locked && next.path !== b.path,
    })
  }

  const save = async (idx) => {
    const b = buckets[idx]
    const r = await fetch(`/api/people/${personId}/life-stages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: b.bucket, path: b.path }),
    })
    if (r.ok) updateBucket(idx, { locked: true, dirty: false })
  }

  const unlock = async (idx) => {
    const b = buckets[idx]
    const r = await fetch(`/api/people/${personId}/life-stages/${b.bucket}`, { method: 'DELETE' })
    if (r.ok) {
      updateBucket(idx, { locked: false, dirty: false })
      // Reload so auto-pick takes over.
      load()
    }
  }

  if (buckets === null || buckets.length === 0) return null

  return (
    <div className="mb-8">
      <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Through the years</p>
      <div
        ref={scrollRef}
        onWheel={onWheel}
        className="-mx-1 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {buckets.map((b, i) => (
          <div key={b.bucket} className="group flex shrink-0 flex-col items-center gap-1.5 pb-3">
            <div className="relative" style={{ height: SLOT, width: SLOT }}>
              <button
                type="button"
                onClick={() => navigate(`/gallery/photo/${b.path}`)}
                className="block h-full w-full overflow-hidden rounded-lg ring-1 ring-white/10 transition-all hover:ring-white/30"
                title={`${b.bucket} · ${b.count} photo${b.count === 1 ? '' : 's'}`}
              >
                <img src={b.thumb_url} alt={b.age_text} loading="lazy" className="h-full w-full object-cover" />
              </button>

              {b.crop_url && (
                <img
                  src={b.crop_url}
                  alt=""
                  loading="lazy"
                  className="pointer-events-none absolute -bottom-3 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full object-cover ring-2 ring-black/80"
                />
              )}

              {/* Lock indicator — always visible when locked + clean */}
              {b.locked && !b.dirty && (
                <span className="pointer-events-none absolute right-1 top-1 rounded-full bg-black/60 p-1 text-emerald-400">
                  <Lock size={10} />
                </span>
              )}

              {/* Hover actions */}
              <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                {b.count > 1 && (
                  <button
                    type="button"
                    onClick={() => cycle(i)}
                    title={`Next of ${b.count}`}
                    className="rounded-full bg-black/70 p-1 text-white/80 transition-colors hover:bg-black hover:text-white"
                  >
                    <RefreshCw size={12} />
                  </button>
                )}
                {b.locked && !b.dirty ? (
                  <button
                    type="button"
                    onClick={() => unlock(i)}
                    title="Unlock (back to auto-pick)"
                    className="rounded-full bg-black/70 p-1 text-emerald-400 transition-colors hover:bg-black"
                  >
                    <Unlock size={12} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => save(i)}
                    title={b.dirty ? 'Save this one' : 'Lock as this person\'s photo for this age'}
                    className="rounded-full bg-black/70 p-1 text-white/80 transition-colors hover:bg-black hover:text-white"
                  >
                    <Lock size={12} />
                  </button>
                )}
              </div>
            </div>
            <span className="mt-1 text-[11px] text-white/55">{b.age_text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
