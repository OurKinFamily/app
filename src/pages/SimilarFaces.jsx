import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { PersonSearch } from '../ui/faces/PersonSearch'
import { SimilarFace } from '../ui/faces/SimilarFace'
import { LoadingDots } from '../ui/LoadingDots'
import { MediaDetail } from '../ui/MediaDetail'
import { useToast } from '../components/Toast'
import { isVideo, mediaUrl } from '../lib/media'
import { displayName } from '../lib/people'
import { C } from '../ui/tokens'

/**
 * "Find more of this person."
 *
 * Takes everything already confirmed about somebody, and sweeps the whole
 * archive for faces that look like them — the way to go from a handful of
 * tagged photographs to all of them.
 *
 * Two things make it usable rather than alarming. The similarity of every
 * result is shown, because a 94% match and a 52% match deserve different
 * amounts of trust. And nothing is assigned without being selected: this can
 * return thousands of faces, and a bulk action on a bad sweep is a mess that
 * takes an afternoon to unpick.
 */

const PAGE = 120

export function SimilarFaces() {
  const [params, setParams] = useSearchParams()
  const personId = params.get('person_id')
  const { toast } = useToast()

  const [person, setPerson] = useState(null)
  // Held as "how alike, at least" — which is what the page asks for and what
  // every result displays. The endpoint wants the opposite: its `threshold` is
  // a DISTANCE, so it filters on `sim < 1 - threshold`. Passing this straight
  // through inverted the control — picking 40% asked for faces at least 60%
  // alike, and returned fewer than 50% did.
  const [minSimilarity, setMinSimilarity] = useState(0.5)
  const [results, setResults] = useState(null)
  const [facesUsed, setFacesUsed] = useState(null)
  const [shown, setShown] = useState(PAGE)
  const [selected, setSelected] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    if (!personId) return
    let alive = true
    fetch(`/api/people/${personId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(p => { if (alive) setPerson(p) })
      .catch(() => {})
    return () => { alive = false }
  }, [personId])

  const search = useCallback(async (signal) => {
    if (!personId) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/faces/search/by_person_temporal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          person_id: personId,
          threshold: Number((1 - minSimilarity).toFixed(4)),
          // Enough to work through in a sitting. The endpoint applies this
          // last, so it is not what makes a sweep quick — but asking for a
          // hundred thousand faces was never anything but a promise to
          // render them.
          limit: 500,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'The search failed')
      const data = await res.json()
      setResults(data.results || [])
      setFacesUsed(data.faces_used ?? null)
      setShown(PAGE)
      setSelected(new Set())
    } catch (e) {
      // An aborted request is this component tidying up after itself, not a
      // failure worth showing anybody.
      if (e.name === 'AbortError') return
      setError(e.message)
      setResults([])
    } finally {
      if (!signal?.aborted) setBusy(false)
    }
  }, [personId, minSimilarity])

  // Abort on cleanup. StrictMode runs an effect twice in development, and
  // without this a sweep that takes a minute was being run twice at once —
  // doubling the load on an endpoint that already blocks everything else.
  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => search(controller.signal))
    return () => controller.abort()
  }, [search])

  const toggle = i => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    return next
  })

  const visible = (results || []).slice(0, shown)
  const allPicked = visible.length > 0 && visible.every((_, i) => selected.has(i))

  async function assign() {
    if (!selected.size || !personId) return
    setBusy(true)
    try {
      const faces = [...selected].map(i => results[i]).filter(Boolean).map(f => ({
        photo_path: f.photo_path, face_index: f.face_index,
      }))
      const res = await fetch('/api/faces/search/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: personId, faces }),
      })
      if (!res.ok) throw new Error('The assignment failed')
      toast.success(`${faces.length.toLocaleString()} faces assigned to ${displayName(person || {})}`)
      // Drop what was just assigned rather than re-running a sweep that takes
      // its time — they are no longer candidates by definition.
      setResults(prev => prev.filter((_, i) => !selected.has(i)))
      setSelected(new Set())
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 8px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Find more faces</h1>
        <div style={{ flex: 1 }} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.muted }}>
          At least
          <select
            value={minSimilarity}
            onChange={e => setMinSimilarity(Number(e.target.value))}
            style={select}
          >
            {/* Every 2.5 points across the useful range. The difference
                between 45% and 50% on a sweep of 16,000 faces is thousands of
                results, so the steps that matter are small ones. */}
            {[0.30, 0.325, 0.35, 0.375, 0.40, 0.425, 0.45, 0.475,
              0.50, 0.525, 0.55, 0.575, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90].map(v => (
              <option key={v} value={v}>{+(v * 100).toFixed(1)}% alike</option>
            ))}
          </select>
        </label>
      </div>

      {!personId ? (
        <div style={{ maxWidth: 320 }}>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 8px' }}>
            Whose face are you looking for?
          </p>
          <PersonSearch onPick={p => setParams({ person_id: p.id })} />
        </div>
      ) : (
        <>
          <header style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            paddingBottom: 12, borderBottom: `1px solid ${C.border}`,
          }}>
            <Avatar
              name={person?.name || '?'}
              src={person?.avatar ? mediaUrl(person.avatar) : null}
              size={36}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>{person ? displayName(person) : 'Loading…'}</div>
              <div style={{ fontSize: 11.5, color: C.muted }}>
                {facesUsed != null && `${facesUsed.toLocaleString()} known faces searched against`}
              </div>
            </div>
            {person && (
              <Link to={`/people/${person.id}`} style={linkish}>Their page →</Link>
            )}
            <div style={{ width: 200 }}>
              <PersonSearch
                placeholder="Somebody else…"
                onPick={p => setParams({ person_id: p.id })}
              />
            </div>
          </header>

          {error && <p style={{ color: '#c5221f', fontSize: 13 }}>{error}</p>}
          {busy && !results && <LoadingDots />}

          {results && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap',
              }}>
                <strong style={{ fontSize: 13.5, fontWeight: 500 }}>
                  {results.length.toLocaleString()} possible {results.length === 1 ? 'face' : 'faces'}
                </strong>
                {results.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelected(allPicked
                      ? new Set()
                      : new Set(visible.map((_, i) => i)))}
                    style={linkish}
                  >
                    {allPicked ? 'Clear' : `Select these ${visible.length.toLocaleString()}`}
                  </button>
                )}
                <div style={{ flex: 1 }} />
                {selected.size > 0 && (
                  <button
                    type="button"
                    onClick={assign}
                    disabled={busy}
                    style={{ ...primary, opacity: busy ? 0.5 : 1 }}
                  >
                    Assign {selected.size.toLocaleString()} to {person ? displayName(person) : 'them'}
                  </button>
                )}
              </div>

              {results.length === 0 && !busy && (
                <p style={{ fontSize: 13, color: C.muted }}>
                  Nothing else is at least {+(minSimilarity * 100).toFixed(1)}% alike.
                  A lower number will find more, and be wrong more often.
                </p>
              )}

              <div style={{
                display: 'grid', gap: 6,
                // Smaller: a sweep returns hundreds, and judging them is a matter of
                // scanning for the one that is obviously somebody else, which
                // wants more faces on screen rather than bigger ones.
                gridTemplateColumns: 'repeat(auto-fill, minmax(54px, 1fr))',
              }}>
                {visible.map((face, i) => (
                  <SimilarFace
                    key={`${face.photo_path}#${face.face_index}`}
                    face={face}
                    picked={selected.has(i)}
                    onToggle={() => toggle(i)}
                    onOpen={() => setPhoto(face.photo_path)}
                  />
                ))}
              </div>

              {shown < results.length && (
                <button type="button" onClick={() => setShown(s => s + PAGE)} style={more}>
                  Show more — {(results.length - shown).toLocaleString()} left
                </button>
              )}
            </>
          )}
        </>
      )}

      {photo && (
        <MediaDetail
          item={{
            path: photo,
            url: mediaUrl(photo),
            is_video: isVideo(photo),
            thumbnail_url: isVideo(photo) ? mediaUrl(`${photo}.poster.jpg`) : mediaUrl(photo),
            filename: photo.split('/').pop(),
          }}
          onClose={() => setPhoto(null)}
        />
      )}
    </div>
  )
}

const select = {
  height: 30, padding: '0 8px', borderRadius: 8,
  border: `1px solid ${C.border}`, background: C.bg,
  font: 'inherit', fontSize: 12.5, color: C.text, cursor: 'pointer',
}
const linkish = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 12.5, cursor: 'pointer', textDecoration: 'none', padding: 0,
}
const primary = {
  height: 32, padding: '0 14px', borderRadius: 16, fontSize: 12.5,
  border: 0, background: C.activeText, color: '#fff', cursor: 'pointer',
}
const more = {
  width: '100%', height: 32, borderRadius: 16, fontSize: 12.5, marginTop: 10,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}
