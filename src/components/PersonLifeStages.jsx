import { useEffect, useState } from 'react'
import { Lock, Unlock, RefreshCw } from 'lucide-react'
import { PhotoStrip } from './PhotoStrip'
import { StripFrame } from './StripFrame'

// Person-page film strip: pulls life-stage buckets from the api,
// renders them as StripFrames inside a PhotoStrip (caption ribbon +
// hover-only actions for cycle / lock / unlock + click-to-open).

export function PersonLifeStages({ personId }) {
  const [buckets, setBuckets] = useState(null)

  const load = () => {
    fetch(`/api/people/${personId}/life-stages`)
      .then(r => (r.ok ? r.json() : { buckets: [] }))
      .then(d => setBuckets((d.buckets || []).map(b => ({ ...b, _cands: null }))))
      .catch(() => setBuckets([]))
  }

  useEffect(() => {
    if (!personId) return
    setBuckets(null)
    load()
  }, [personId])

  const update = (idx, patch) => {
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
    const curIdx = cands.findIndex(c => c.path === b.path)
    const next = cands[(Math.max(curIdx, 0) + 1) % cands.length]
    update(idx, {
      _cands: cands,
      path: next.path, url: next.url,
      thumb_url: next.thumb_url, crop_url: next.crop_url,
      age_text: next.age_text,
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
    if (r.ok) update(idx, { locked: true, dirty: false })
  }

  const unlock = async (idx) => {
    const b = buckets[idx]
    const r = await fetch(`/api/people/${personId}/life-stages/${b.bucket}`, { method: 'DELETE' })
    if (r.ok) {
      update(idx, { locked: false, dirty: false })
      load()
    }
  }

  if (!buckets || buckets.length === 0) return null

  return (
    <div className="mb-8">
      <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Reeling in the years</p>
      <PhotoStrip>
        {buckets.map((b, i) => {
          const actions = []
          if (b.count > 1) {
            actions.push({
              key: 'cycle',
              icon: <RefreshCw size={12} />,
              title: `Next of ${b.count}`,
              onClick: () => cycle(i),
            })
          }
          if (b.locked && !b.dirty) {
            actions.push({
              key: 'unlock',
              icon: <Unlock size={12} />,
              title: 'Unlock (back to auto-pick)',
              onClick: () => unlock(i),
              tone: 'text-emerald-400 hover:text-emerald-300',
            })
          } else {
            actions.push({
              key: 'save',
              icon: <Lock size={12} />,
              title: b.dirty ? 'Save this one' : "Lock as this person's photo for this age",
              onClick: () => save(i),
            })
          }
          return (
            <StripFrame
              key={b.bucket}
              image={{ src: b.thumb_url, alt: b.age_text }}
              caption={b.age_text}
              badge={b.locked && !b.dirty ? <Lock size={10} className="text-emerald-400" /> : null}
              actions={actions}
              title={`${b.age_text} · ${b.count} photo${b.count === 1 ? '' : 's'}`}
            />
          )
        })}
      </PhotoStrip>
    </div>
  )
}
