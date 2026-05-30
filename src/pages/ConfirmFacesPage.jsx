import { useEffect, useRef, useState } from 'react'
import { Check, SkipForward, X } from 'lucide-react'
import { Container } from '../components/Container'
import { Button } from '../components/Button'
import { Tag } from '../components/Tag'
import { Avatar } from '../components/Avatar'
import { MediaLightbox } from '../components/MediaLightbox'
import { MediaDetail } from '../components/MediaDetail'
import { isVideo, mediaUrl, thumbUrl } from '../lib/media'
import { getClusters } from '../lib/api'

// Walk through every person who has enough tagged faces to produce a
// reliable mean embedding, fetch high-similarity unassigned candidates,
// and let the user bulk-confirm them in one click. Each card = one person.
//
// Single-page UX:
// - Top: sticky stats + similarity threshold knob
// - Body: the current person's card with all candidate face crops
// - Click each crop to toggle exclude (red overlay)
// - "Confirm" assigns the non-excluded faces and advances to the next
//   person who has candidates.

const SEARCH_THRESHOLD = 0.5   // sent to /search/by_person (distance space)
const MIN_SIM_DEFAULT  = 0.80  // filter: only show results ≥ this similarity
const MAX_PER_PERSON   = 200   // cap the visible candidate count per person
const SKIPPED_KEY      = 'ourkin:confirm-faces:skipped'        // person ids (explicit Skip)
const DEAD_FACES_KEY   = 'ourkin:confirm-faces:dead-faces'     // "photo_path::face_index" entries the API failed to assign

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) }
  catch { return new Set() }
}
function persistSet(key, s) {
  try { localStorage.setItem(key, JSON.stringify([...s])) } catch { /* quota */ }
}
const faceKey = (photo_path, face_index) => `${photo_path}::${face_index}`

export function ConfirmFacesPage() {
  const [people, setPeople] = useState(null)         // [{id, person_name, person_known_as, person_avatar, size}, …]
  const [sort, setSort]     = useState('most')       // 'most' | 'fewest' | 'alpha'
  const [idx, setIdx]       = useState(0)
  const [candidates, setCandidates] = useState(null) // {person, items} | null
  const [excluded, setExcluded]     = useState(() => new Set())
  const [minSim, setMinSim]         = useState(MIN_SIM_DEFAULT)
  const [busy, setBusy]             = useState(false)
  const [done, setDone]             = useState(0)    // counter of people confirmed/skipped
  const [error, setError]           = useState(null)
  const [viewer, setViewer]         = useState(null) // index into candidates.items
  const [tick, setTick]             = useState(0)    // bump to force re-fetch of current person
  const [skipped, setSkipped]       = useState(() => loadSet(SKIPPED_KEY))
  const [deadFaces, setDeadFaces]   = useState(() => loadSet(DEAD_FACES_KEY))
  const inflightRef = useRef(null)

  useEffect(() => { persistSet(SKIPPED_KEY, skipped) }, [skipped])
  useEffect(() => { persistSet(DEAD_FACES_KEY, deadFaces) }, [deadFaces])

  function addSkipped(personId) {
    setSkipped(prev => {
      if (prev.has(personId)) return prev
      const next = new Set(prev)
      next.add(personId)
      return next
    })
  }

  function addDeadFaces(facesArr) {
    if (!facesArr?.length) return
    setDeadFaces(prev => {
      const next = new Set(prev)
      for (const f of facesArr) next.add(faceKey(f.photo_path, f.face_index))
      return next
    })
  }

  function clearSkipped() {
    setSkipped(new Set())
    setIdx(0)
    setTick(t => t + 1)
  }

  // Load people who have ≥5 assigned faces (need a stable mean).
  useEffect(() => {
    getClusters('assigned', 500, 0)
      .then(d => {
        const list = (d.clusters || []).filter(c => c.size >= 5)
        setPeople(list)
      })
      .catch(e => setError(String(e)))
  }, [])

  // Re-sort whenever the sort knob flips. Reset to the top of the new order.
  useEffect(() => {
    if (!people) return
    const sorted = [...people]
    if (sort === 'most')   sorted.sort((a, b) => b.size - a.size)
    if (sort === 'fewest') sorted.sort((a, b) => a.size - b.size)
    if (sort === 'alpha')  sorted.sort((a, b) =>
      (a.person_name || '').localeCompare(b.person_name || ''))
    // Only update if order actually changed (avoid infinite loop with the same
    // reference).
    const orderChanged = sorted.some((p, i) => p.person_id !== people[i].person_id)
    if (orderChanged) {
      setPeople(sorted)
      setIdx(0)
    }
  }, [sort, people])

  // Search for the current person; auto-skip ones with no candidates.
  useEffect(() => {
    if (!people || idx >= people.length) return
    let alive = true
    inflightRef.current = null
    setCandidates(null)
    setExcluded(new Set())
    ;(async () => {
      let cursor = idx
      while (alive && cursor < people.length) {
        const p = people[cursor]
        if (skipped.has(p.person_id)) { cursor++; continue }
        try {
          const res = await fetch('/api/faces/search/by_person', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ person_id: p.person_id, threshold: SEARCH_THRESHOLD, limit: 1000 }),
          })
          if (!res.ok) { cursor++; continue }
          const data = await res.json()
          const filtered = (data.results || [])
            .filter(r => (r.similarity ?? 0) >= minSim)
            .filter(r => !deadFaces.has(faceKey(r.photo_path, r.face_index)))
            .slice(0, MAX_PER_PERSON)
          if (filtered.length > 0) {
            if (!alive) return
            setCandidates({ person: p, items: filtered })
            setIdx(cursor)
            return
          }
        } catch { /* try next */ }
        cursor++
      }
      if (!alive) return
      setCandidates({ done: true })
    })()
    return () => { alive = false }
  }, [people, idx, minSim, tick, skipped])

  async function confirm() {
    if (!candidates?.items || busy) return
    setBusy(true)
    const p = candidates.person
    const toAssign = candidates.items.filter(f => !excluded.has(`${f.photo_path}:${f.face_index}`))
    try {
      const r = await fetch('/api/faces/search/assign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          person_id: p.person_id,
          faces: toAssign.map(f => ({
            photo_path: f.photo_path,
            face_index: f.face_index,
            crop_path:  '',
          })),
        }),
      })
      const data = r.ok ? await r.json() : null
      const assigned = data?.assigned ?? 0
      const missing = data?.missing?.length ?? 0
      setDone(d => d + assigned)
      if (missing > 0) {
        // Some/all faces couldn't be assigned — stale embedding-index
        // paths not matching Neo4j Media nodes (issue #46). Remember the
        // specific (path, face_index) pairs so they never resurface in
        // search results again, even across reloads. User clicked
        // Confirm — they shouldn't keep seeing the same bad candidates.
        console.warn('[ConfirmFaces] %d face(s) could not be assigned (stale paths). Adding to dead-faces list.', missing, data?.missing)
        addDeadFaces(data?.missing || [])
      }
      if (assigned === 0) {
        // Nothing landed — auto-skip to the next person in-session so the
        // UI doesn't refetch the same now-empty bucket forever.
        setIdx(i => i + 1)
      } else {
        // Re-fetch the SAME person: their candidate list was capped at
        // MAX_PER_PERSON; if more remain above the threshold they'll show
        // in the next batch.
        setTick(t => t + 1)
      }
    } finally {
      setBusy(false)
    }
  }

  function skipPerson() {
    const p = candidates?.person
    if (p) addSkipped(p.person_id)
    setIdx(i => i + 1)
  }

  function toggleExclude(key) {
    setExcluded(s => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key); else n.add(key)
      return n
    })
  }

  if (error) return <Container className="py-6"><p className="text-[13px] text-red-400">Error: {error}</p></Container>
  if (!people) return <Container className="py-6"><p className="text-[13px] text-white/30">Loading people…</p></Container>

  if (candidates?.done) {
    return (
      <Container className="py-6">
        <h1 className="mb-3 text-lg font-medium text-white/80">Confirm Faces</h1>
        <p className="text-[13px] text-white/40">
          Reviewed every eligible person. {done} confirmed.
        </p>
        <Button className="mt-4" variant="secondary" size="sm" onClick={() => { setIdx(0); setDone(0) }}>
          Restart from the top
        </Button>
      </Container>
    )
  }

  return (
    <Container className="py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-medium text-white/80">Confirm Faces</h1>
        <Tag tone="green">{done} confirmed</Tag>
        <Tag tone="slate">{idx + 1} / {people.length}</Tag>
        {skipped.size > 0 && (
          <Button variant="secondary" size="sm" onClick={clearSkipped}>
            <X size={12} /> Clear skipped ({skipped.size})
          </Button>
        )}
        <span className="ml-auto flex items-center gap-2 text-[12px] text-white/50">
          <span>Sort</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="rounded border border-white/15 bg-zinc-900 px-2 py-1 text-white"
          >
            <option value="most"   className="bg-zinc-900 text-white">Most faces</option>
            <option value="fewest" className="bg-zinc-900 text-white">Fewest faces</option>
            <option value="alpha"  className="bg-zinc-900 text-white">A → Z</option>
          </select>
        </span>
        <span className="flex items-center gap-2 text-[12px] text-white/50">
          <span>Min sim</span>
          <input
            type="range"
            min="0.5" max="0.99" step="0.01"
            value={minSim}
            onChange={e => setMinSim(parseFloat(e.target.value))}
            className="w-32 accent-blue-500"
          />
          <span className="tabular-nums text-white/70">{(minSim * 100).toFixed(0)}%</span>
        </span>
      </div>

      {!candidates && <p className="text-[13px] text-white/30">Searching…</p>}

      {candidates?.items && (
        <div className="rounded-xl border border-white/10 bg-white/3 p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar
                src={candidates.person.person_avatar ? mediaUrl(candidates.person.person_avatar) : null}
                name={candidates.person.person_name}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-medium text-white">
                  {candidates.person.person_known_as && candidates.person.person_known_as !== candidates.person.person_name && (
                    <span className="text-white/40">({candidates.person.person_known_as}) </span>
                  )}
                  {candidates.person.person_name}
                </h2>
                <p className="text-[12px] text-white/40">
                  {candidates.items.length} candidate{candidates.items.length === 1 ? '' : 's'}
                  {excluded.size > 0 && <span className="ml-2 text-red-400/70">· {excluded.size} excluded</span>}
                  {' · '}{candidates.person.size.toLocaleString()} already assigned
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={skipPerson} disabled={busy} className="flex-1 md:flex-none">
                <SkipForward size={14} /> Skip
              </Button>
              <Button size="sm" onClick={confirm} disabled={busy || candidates.items.length === excluded.size} className="flex-1 md:flex-none">
                <Check size={14} /> Confirm {candidates.items.length - excluded.size}
              </Button>
            </div>
          </div>

          <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(72px,1fr))]">
            {candidates.items.map((f, i) => {
              const key = `${f.photo_path}:${f.face_index}`
              const isExcluded = excluded.has(key)
              return (
                <div key={key} className="group/face relative aspect-square">
                  <button
                    onClick={() => setViewer(i)}
                    title={`${(f.similarity * 100).toFixed(0)}% match · click to view full photo`}
                    className={
                      'block h-full w-full overflow-hidden rounded ' +
                      (isExcluded ? 'opacity-30 ring-1 ring-red-500/60' : 'ring-1 ring-white/10 hover:ring-white/30')
                    }
                  >
                    <img
                      src={f.crop_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full bg-white/5 object-cover"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-[10px] tabular-nums text-white/85 py-0.5">
                      {(f.similarity * 100).toFixed(0)}%
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleExclude(key) }}
                    aria-label={isExcluded ? 'Include' : 'Exclude'}
                    title={isExcluded ? 'Include this face' : 'Exclude this face from confirm'}
                    className={
                      'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 transition-colors ' +
                      (isExcluded
                        ? 'bg-red-500 text-white opacity-100'
                        : 'bg-zinc-900 text-white/70 opacity-0 hover:bg-red-500 hover:text-white group-hover/face:opacity-100')
                    }
                  >
                    <X size={11} strokeWidth={3} />
                  </button>
                </div>
              )
            })}
          </div>

          {viewer !== null && candidates.items[viewer] && (
            <MediaLightbox
              items={candidates.items.map(f => {
                const path = (f.photo_path || '').replace(/^\/photos\//, '')
                return {
                  path,
                  url:           mediaUrl(path),
                  thumbnail_url: thumbUrl(path),
                  is_video:      isVideo(path),
                }
              })}
              initialIndex={viewer}
              onClose={() => setViewer(null)}
              renderDetail={(it, ctx, v) => <MediaDetail key={`${it.path}-${v}`} item={it} ctx={ctx} />}
            />
          )}
        </div>
      )}
    </Container>
  )
}
