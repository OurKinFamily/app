import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { searchPeople } from '../lib/api'
import { isVideo } from '../lib/media'
import { useEscToClose } from '../lib/hooks'

const PAGE_SIZE = 100

export function SimilarFacesPage() {
  const [searchParams] = useSearchParams()
  const photoPath = searchParams.get('photo_path')
  const faceIndex = parseInt(searchParams.get('face_index') ?? '0', 10)
  const seedCrop  = searchParams.get('seed_crop')
  const personId  = searchParams.get('person_id')

  const [activePath, setActivePath]       = useState(photoPath)
  const [activeFaceIdx, setActiveFaceIdx] = useState(faceIndex)
  const [activeSeedCrop, setActiveSeedCrop] = useState(seedCrop ? `/api/media/${seedCrop}` : null)

  const [threshold, setThreshold] = useState(0.5)
  const [allResults, setAllResults] = useState(null)
  const [facesUsed, setFacesUsed]   = useState(null)
  const [buckets, setBuckets]       = useState(null)
  const [shown, setShown]           = useState(PAGE_SIZE)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  const [selected, setSelected]     = useState(new Set())
  const [knownPerson, setKnownPerson] = useState(null) // set when arriving via person_id
  const [personQuery, setPersonQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [assigning, setAssigning]   = useState(false)
  const [assigned, setAssigned]     = useState(0)
  const [lightbox, setLightbox]     = useState(null)

  const sentinelRef = useRef(null)

  const search = useCallback(async () => {
    setLoading(true)
    setError(null)
    setAllResults(null)
    setFacesUsed(null)
    setBuckets(null)
    setShown(PAGE_SIZE)
    setSelected(new Set())
    try {
      let res
      if (personId && !photoPath) {
        res = await fetch('/api/faces/search/by_person_temporal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ person_id: personId, threshold, limit: 100000 }),
        })
      } else {
        if (!activePath) return
        res = await fetch('/api/faces/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_path: activePath, face_index: activeFaceIdx, threshold, limit: 100000 }),
        })
      }
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Search failed')
      }
      const data = await res.json()
      setAllResults(data.results)
      if (data.faces_used != null) setFacesUsed(data.faces_used)
      if (data.buckets) setBuckets(data.buckets)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [personId, photoPath, activePath, activeFaceIdx, threshold])

  // Resolve person name + avatar for display and pre-populated assign
  useEffect(() => {
    if (!personId || photoPath) return
    Promise.all([
      fetch(`/api/people/${personId}`).then(r => r.json()),
      fetch(`/api/people/${personId}/faces`).then(r => r.json()),
    ]).then(([person, faces]) => {
      setKnownPerson(person)
      if (!faces.length) return
      const face = person.avatar
        ? (faces.find(f => f.crop_path === person.avatar) || faces[0])
        : faces[0]
      setActiveSeedCrop(`/api/media/${face.crop_path}`)
    }).catch(() => {})
  }, [personId])

  useEffect(() => {
    if (personId || activePath) search()
  }, [personId, activePath, activeFaceIdx])

  // Infinite scroll sentinel
  useEffect(() => {
    if (!allResults) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setShown(n => Math.min(n + PAGE_SIZE, allResults.length)) },
      { rootMargin: '400px' }
    )
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [allResults])

  useEffect(() => {
    if (!personQuery.trim()) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      setSuggestions(await searchPeople(personQuery).catch(() => []))
    }, 200)
    return () => clearTimeout(t)
  }, [personQuery])

  function toggleAll() {
    if (!allResults) return
    if (selected.size === allResults.length) setSelected(new Set())
    else setSelected(new Set(allResults.map((_, i) => i)))
  }

  async function assignSelected(person) {
    const faces = [...selected].map(i => allResults[i])
    setAssigning(true)
    try {
      await fetch('/api/faces/search/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: person.id,
          faces: faces.map(f => ({
            photo_path: f.photo_path,
            face_index: f.face_index,
            crop_path:  '',
          })),
        }),
      })
      const removedKeys = new Set(faces.map(f => `${f.photo_path}:${f.face_index}`))
      setAllResults(prev => prev.filter(r => !removedKeys.has(`${r.photo_path}:${r.face_index}`)))
      setAssigned(prev => prev + faces.length)
      setSelected(new Set())
      setPersonQuery('')
      setSuggestions([])
    } finally {
      setAssigning(false)
    }
  }

  if (!activePath && !personId) {
    return (
      <div className="p-6 text-white/30 text-sm">
        No face selected. Open a photo, click a face crop, then "Find similar".
      </div>
    )
  }

  const visible = allResults?.slice(0, shown) ?? []

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-lg font-medium text-white/80">Similar Faces</h1>
        {knownPerson && (
          <Link to={`/manage/people/${personId}`}
            className="text-[12px] text-white/35 hover:text-white/60 transition-colors">
            ← {knownPerson.known_as || knownPerson.name}
          </Link>
        )}
      </div>

      {/* Seed + controls */}
      <div className="flex items-start gap-4 mb-6 p-4 bg-white/3 border border-white/8 rounded-xl">
        {activeSeedCrop && (
          <img src={activeSeedCrop} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 ring-2 ring-white/20" />
        )}
        <div className="flex-1 space-y-2">
          {facesUsed != null ? (
            <div>
              <p className="text-[12px] text-white/40">
                {buckets ? `${buckets.length} temporal means` : 'Mean'} · {facesUsed.toLocaleString()} faces
              </p>
              {buckets && (
                <div className="flex gap-2 mt-1 flex-wrap">
                  {buckets.map((b, i) => (
                    <span key={i} className="text-[10px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded">
                      {b.from === b.to ? b.from : `${b.from}–${b.to}`} · {b.faces}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-white/40 break-all">{photoPath} · face {faceIndex}</p>
          )}
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-white/40">Threshold</label>
            <input type="range" min="0.3" max="0.9" step="0.05" value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
              className="w-32 accent-blue-500" />
            <span className="text-[11px] text-white/50 w-8">{threshold}</span>
            <button onClick={search} disabled={loading}
              className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white/70 text-[12px] rounded transition-colors disabled:opacity-50">
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
          <p className="text-[11px] text-white/25">Lower threshold = stricter (fewer, closer matches)</p>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {loading && <p className="text-white/30 text-sm">Searching {(100000).toLocaleString()} faces…</p>}

      {allResults && (
        <>
          {/* Bulk assign bar */}
          <div className="flex items-center gap-3 mb-4 sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur py-2">
            <button onClick={toggleAll} className="text-[11px] text-white/40 hover:text-white/70 px-2 py-1 border border-white/10 rounded transition-colors">
              {selected.size === allResults.length ? 'Deselect all' : `Select all ${allResults.length.toLocaleString()}`}
            </button>
            {selected.size > 0 && (
              <>
                <span className="text-[11px] text-white/50">{selected.size.toLocaleString()} selected</span>
                {knownPerson ? (
                  <button disabled={assigning} onClick={() => assignSelected(knownPerson)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[12px] rounded transition-colors disabled:opacity-50">
                    {knownPerson.avatar
                      ? <img src={`/api/media/${knownPerson.avatar}`} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                      : <div className="w-4 h-4 rounded-full bg-white/10 shrink-0" />}
                    Assign to {knownPerson.known_as || knownPerson.name}
                  </button>
                ) : (
                  <div className="relative flex-1 max-w-xs">
                    <input value={personQuery} onChange={e => setPersonQuery(e.target.value)}
                      placeholder="Assign to person…"
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white placeholder-white/25 outline-none focus:border-white/25" />
                    {suggestions.length > 0 && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded overflow-hidden z-20 shadow-xl">
                        {suggestions.map(p => (
                          <button key={p.id} disabled={assigning} onClick={() => assignSelected(p)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-white/60 hover:bg-white/5 hover:text-white text-left">
                            {p.avatar
                              ? <img src={`/api/media/${p.avatar}`} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                              : <div className="w-4 h-4 rounded-full bg-white/10 shrink-0" />}
                            {p.known_as || p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {assigned > 0 && <span className="text-[11px] text-green-400">{assigned} assigned</span>}
            <span className="ml-auto text-[11px] text-white/25">
              {shown < allResults.length
                ? `${shown} / ${allResults.length.toLocaleString()}`
                : `${allResults.length.toLocaleString()} results`}
            </span>
          </div>

          {/* Grid */}
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
            {visible.map((r, i) => {
              const sel = selected.has(i)
              return (
                <div key={i} className="relative group/thumb aspect-square">
                  <button
                    onClick={() => setSelected(s => { const n = new Set(s); sel ? n.delete(i) : n.add(i); return n })}
                    className={`w-full h-full rounded overflow-hidden transition-all ${sel ? 'ring-2 ring-blue-400' : 'hover:opacity-80'}`}>
                    <img src={r.crop_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    {sel && <div className="absolute inset-0 bg-blue-500/20 rounded" />}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white/60 text-center py-0.5">
                      {(r.similarity * 100).toFixed(0)}%
                    </div>
                    {sel && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">✓</span>
                      </div>
                    )}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setLightbox({ photoPath: r.photo_path, cropUrl: r.crop_url, similarity: r.similarity }) }}
                    className="absolute top-1 left-1 opacity-0 group-hover/thumb:opacity-100 w-5 h-5 bg-black/70 hover:bg-black/90 rounded flex items-center justify-center text-white/70 hover:text-white transition-all text-[10px]"
                    title="View full photo"
                  >⤢</button>
                </div>
              )
            })}
          </div>

          <div ref={sentinelRef} className="h-16 flex items-center justify-center text-white/20 text-[11px]">
            {shown < allResults.length ? 'Loading more…' : ''}
          </div>
        </>
      )}

      {lightbox && <Lightbox lightbox={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}

function Lightbox({ lightbox, onClose }) {
  useEscToClose(onClose)
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6" onClick={onClose}>
      <div className="relative flex gap-4 items-start max-w-5xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white text-sm transition-colors">
          ✕
        </button>
        <div className="flex-1 min-w-0">
          {isVideo(lightbox.photoPath) ? (
            <video src={`/api/media/${lightbox.photoPath}`} controls className="w-full max-h-[80vh] rounded-lg" />
          ) : (
            <img src={`/api/media/${lightbox.photoPath}`} alt="" className="w-full max-h-[80vh] object-contain rounded-lg" />
          )}
          <p className="text-[11px] text-white/30 mt-2 break-all">{lightbox.photoPath}</p>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-2">
          <img src={lightbox.cropUrl} alt="" className="w-40 h-40 object-cover rounded-lg ring-2 ring-white/20" />
          <span className="text-[12px] text-white/50">{(lightbox.similarity * 100).toFixed(1)}% match</span>
        </div>
      </div>
    </div>
  )
}
