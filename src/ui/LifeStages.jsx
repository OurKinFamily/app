import { useCallback, useEffect, useRef, useState } from 'react'
import { Lock, RefreshCw, Unlock } from 'lucide-react'
import { C } from './tokens'

/**
 * Reeling in the years — one photograph per stage of a person's life.
 *
 * v1 drew this as a strip of 35mm film: dark celluloid, sprocket holes, white
 * leader at each end. A lovely thing on a dark page and wrong on a light one —
 * the metaphor was carrying the darkness, so on white it became a black bar
 * across an otherwise quiet page.
 *
 * What the strip was really doing was saying "these belong in a row, in
 * order". A row of photographs already says that. So the frames stay, the
 * celluloid goes, and the ages move out from on top of the pictures to
 * underneath them where they can be read.
 *
 * The API picks each photograph automatically; cycling steps through the other
 * candidates for that age, and locking fixes the choice so it stops moving.
 */

const SIZE = 104

export function LifeStages({ personId }) {
  const [buckets, setBuckets] = useState(null)
  const scroller = useRef(null)

  const load = useCallback(() => {
    fetch(`/api/people/${personId}/life-stages`)
      .then(r => (r.ok ? r.json() : { buckets: [] }))
      .then(d => setBuckets((d.buckets || []).map(b => ({ ...b, _candidates: null }))))
      .catch(() => setBuckets([]))
  }, [personId])

  useEffect(() => { load() }, [load])

  const update = (i, patch) =>
    setBuckets(prev => prev.map((b, n) => (n === i ? { ...b, ...patch } : b)))

  async function cycle(i) {
    const b = buckets[i]
    let candidates = b._candidates
    if (!candidates) {
      const r = await fetch(`/api/people/${personId}/life-stages/${b.bucket}/candidates`)
      candidates = (r.ok ? await r.json() : { candidates: [] }).candidates
      if (!candidates.length) return
    }
    if (candidates.length <= 1) return
    const at = candidates.findIndex(c => c.path === b.path)
    const next = candidates[(Math.max(at, 0) + 1) % candidates.length]
    update(i, {
      _candidates: candidates,
      path: next.path, url: next.url,
      thumb_url: next.thumb_url, crop_url: next.crop_url,
      age_text: next.age_text,
      // Locked and then changed: the lock still points at the old photograph
      // until it is saved again.
      dirty: b.locked && next.path !== b.path,
    })
  }

  async function lock(i) {
    const b = buckets[i]
    const r = await fetch(`/api/people/${personId}/life-stages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: b.bucket, path: b.path }),
    })
    if (r.ok) update(i, { locked: true, dirty: false })
  }

  async function unlock(i) {
    const r = await fetch(`/api/people/${personId}/life-stages/${buckets[i].bucket}`, {
      method: 'DELETE',
    })
    if (r.ok) { update(i, { locked: false, dirty: false }); load() }
  }

  // A horizontal row with no visible scrollbar needs the wheel to work, or a
  // desktop reader has nothing to scroll it with.
  const onWheel = e => {
    if (!e.deltaY) return
    scroller.current.scrollLeft += e.deltaY
    e.preventDefault()
  }

  if (!buckets?.length) return null

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 2px' }}>
        Reeling in the years
      </h2>
      <p style={{ fontSize: 12, color: C.muted, margin: '0 0 10px' }}>
        One photograph from each stage. Cycle through the others, or lock one so
        it stops changing.
      </p>

      <div
        ref={scroller}
        onWheel={onWheel}
        style={{
          display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4,
          scrollbarWidth: 'none',
        }}
      >
        {buckets.map((b, i) => (
          <Frame
            key={b.bucket}
            bucket={b}
            onCycle={b.count > 1 ? () => cycle(i) : null}
            onLock={() => lock(i)}
            onUnlock={() => unlock(i)}
          />
        ))}
      </div>
    </section>
  )
}

function Frame({ bucket: b, onCycle, onLock, onUnlock }) {
  const [lit, setLit] = useState(false)
  const held = b.locked && !b.dirty

  return (
    <figure
      style={{ margin: 0, flex: '0 0 auto', width: SIZE }}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      onFocus={() => setLit(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setLit(false) }}
    >
      <div style={{
        position: 'relative', width: SIZE, height: SIZE,
        borderRadius: 10, overflow: 'hidden', background: C.hover,
      }}>
        <img
          src={b.thumb_url}
          alt={b.age_text || ''}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* Held photographs say so even at rest — otherwise the only way to
            know a choice is fixed is to hover every one of them. */}
        {held && !lit && (
          <span style={{ ...chip, right: 4, top: 4 }} title="Locked to this photograph">
            <Lock size={10} />
          </span>
        )}

        {lit && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
            gap: 4, padding: 4,
            background: 'linear-gradient(to bottom, rgba(0,0,0,.45), rgba(0,0,0,0) 60%)',
          }}>
            {onCycle && (
              <button
                type="button"
                onClick={onCycle}
                title={`Show the next of ${b.count}`}
                aria-label={`Show the next of ${b.count} photographs`}
                style={action}
              >
                <RefreshCw size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={held ? onUnlock : onLock}
              title={held
                ? 'Locked. Click to let it pick again.'
                : b.dirty ? 'Save this one instead' : 'Keep this one for this age'}
              aria-label={held ? 'Unlock this stage' : 'Lock this photograph'}
              style={{ ...action, color: held ? '#81c995' : '#fff' }}
            >
              {held ? <Unlock size={12} /> : <Lock size={12} />}
            </button>
          </div>
        )}
      </div>

      <figcaption style={{
        fontSize: 11.5, color: C.muted, marginTop: 5, textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }} title={`${b.age_text} · ${b.count} photo${b.count === 1 ? '' : 's'}`}>
        {b.age_text}
      </figcaption>
    </figure>
  )
}

const chip = {
  position: 'absolute', display: 'grid', placeItems: 'center',
  width: 18, height: 18, borderRadius: '50%',
  background: 'rgba(0,0,0,.55)', color: '#81c995',
}

const action = {
  display: 'grid', placeItems: 'center', width: 22, height: 22,
  borderRadius: '50%', border: 0, cursor: 'pointer',
  background: 'rgba(0,0,0,.6)', color: '#fff',
}
