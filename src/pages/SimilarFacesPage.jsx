import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, Maximize2, X } from 'lucide-react'
import { searchPeople } from '../lib/api'
import { isVideo, mediaUrl } from '../lib/media'
import { useEscToClose } from '../lib/hooks'
import { Container } from '../components/new/Container'
import { Button } from '../components/new/Button'
import { Input } from '../components/new/Input'
import { EntityChip } from '../components/new/EntityChip'
import { Select } from '../components/new/Select'
import { Tag } from '../components/new/Tag'

const PAGE_SIZE = 100

function personToOption(p) {
  return {
    value: p.id,
    text: p.known_as || p.name,
    avatar: p.avatar ? mediaUrl(p.avatar) : null,
    initials: true,
    label: (
      <>
        {p.known_as && p.known_as !== p.name && <span className="text-white/35">({p.known_as}) </span>}
        {p.name}
      </>
    ),
  }
}

export function SimilarFacesPage() {
  const [searchParams] = useSearchParams()
  const photoPath = searchParams.get('photo_path')
  const faceIndex = parseInt(searchParams.get('face_index') ?? '0', 10)
  const seedCrop  = searchParams.get('seed_crop')
  const personId  = searchParams.get('person_id')

  const [activePath, setActivePath]       = useState(photoPath)
  const [activeFaceIdx]                   = useState(faceIndex)
  const [activeSeedCrop, setActiveSeedCrop] = useState(seedCrop ? `/api/media/${seedCrop}` : null)

  const [threshold, setThreshold]   = useState(0.5)
  const [allResults, setAllResults] = useState(null)
  const [facesUsed, setFacesUsed]   = useState(null)
  const [buckets, setBuckets]       = useState(null)
  const [shown, setShown]           = useState(PAGE_SIZE)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  const [selected, setSelected]       = useState(new Set())
  const [knownPerson, setKnownPerson] = useState(null)
  const [personOpts, setPersonOpts]   = useState([])
  const [assigning, setAssigning]     = useState(false)
  const [assigned, setAssigned]       = useState(0)
  const [lightbox, setLightbox]       = useState(null)

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
      { rootMargin: '400px' },
    )
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [allResults])

  const onPersonSearch = async q => {
    if (!q.trim()) { setPersonOpts([]); return }
    try {
      const r = await searchPeople(q)
      setPersonOpts(r.map(personToOption))
    } catch { setPersonOpts([]) }
  }

  function toggleAll() {
    if (!allResults) return
    if (selected.size === allResults.length) setSelected(new Set())
    else setSelected(new Set(allResults.map((_, i) => i)))
  }

  async function assignSelected(personIdToAssign) {
    const faces = [...selected].map(i => allResults[i])
    setAssigning(true)
    try {
      await fetch('/api/faces/search/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: personIdToAssign,
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
      setPersonOpts([])
    } finally {
      setAssigning(false)
    }
  }

  if (!activePath && !personId) {
    return (
      <Container className="py-6">
        <p className="text-[13px] text-white/30">
          No face selected. Open a photo, click a face crop, then &ldquo;Find similar&rdquo;.
        </p>
      </Container>
    )
  }

  const visible = allResults?.slice(0, shown) ?? []

  return (
    <Container className="py-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-lg font-medium text-white/80">Similar Faces</h1>
        {knownPerson && (
          <Link to={`/manage/people/${personId}`}
            className="flex items-center gap-1 text-[12px] text-white/35 transition-colors hover:text-white/60">
            <ChevronLeft size={12} /> {knownPerson.known_as || knownPerson.name}
          </Link>
        )}
      </div>

      {/* Seed + controls */}
      <div className="mb-6 flex items-start gap-4 rounded-xl border border-white/8 bg-white/5 p-4">
        {activeSeedCrop && (
          <img src={activeSeedCrop} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover ring-2 ring-white/20" />
        )}
        <div className="flex-1 space-y-2">
          {facesUsed != null ? (
            <div>
              <p className="text-[12px] text-white/40">
                {buckets ? `${buckets.length} temporal means` : 'Mean'} · {facesUsed.toLocaleString()} faces
              </p>
              {buckets && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {buckets.map((b, i) => (
                    <Tag key={i}>
                      {b.from === b.to ? b.from : `${b.from}–${b.to}`} · {b.faces}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="break-all text-[12px] text-white/40">{photoPath} · face {faceIndex}</p>
          )}
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-white/40">Threshold</label>
            <input
              type="range" min="0.3" max="0.9" step="0.05" value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
              className="w-32 accent-blue-500"
            />
            <span className="w-8 text-[11px] text-white/50">{threshold}</span>
            <Button size="sm" onClick={search} disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </div>
          <p className="text-[11px] text-white/25">Lower threshold = stricter (fewer, closer matches)</p>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {loading && <p className="text-[13px] text-white/30">Searching {(100000).toLocaleString()} faces…</p>}

      {allResults && (
        <>
          {/* Bulk assign bar */}
          <div className="sticky top-[var(--app-header-h,3rem)] z-10 mb-4 flex flex-wrap items-center gap-3 bg-[#0a0a0a]/90 py-2 backdrop-blur">
            <Button variant="secondary" size="sm" onClick={toggleAll}>
              {selected.size === allResults.length ? 'Deselect all' : `Select all ${allResults.length.toLocaleString()}`}
            </Button>
            {selected.size > 0 && (
              <>
                <span className="text-[11px] text-white/50">{selected.size.toLocaleString()} selected</span>
                {knownPerson ? (
                  <Button size="sm" disabled={assigning} onClick={() => assignSelected(knownPerson.id)}>
                    Assign to {knownPerson.known_as || knownPerson.name}
                  </Button>
                ) : (
                  <div className="min-w-[14rem] flex-1 max-w-xs">
                    <Select
                      options={personOpts}
                      value={null}
                      onChange={opt => assignSelected(opt.value)}
                      onQueryChange={onPersonSearch}
                      placeholder="Assign to person…"
                    />
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
                <div key={i} className="group/thumb relative aspect-square">
                  <button
                    onClick={() => setSelected(s => { const n = new Set(s); if (sel) n.delete(i); else n.add(i); return n })}
                    className={
                      'h-full w-full overflow-hidden rounded transition-all ' +
                      (sel ? 'ring-2 ring-blue-400' : 'hover:opacity-80')
                    }
                  >
                    <img src={r.crop_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    {sel && <div className="absolute inset-0 rounded bg-blue-500/20" />}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] text-white/60">
                      {(r.similarity * 100).toFixed(0)}%
                    </div>
                    {sel && (
                      <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
                        <span className="text-[8px] font-bold text-white">✓</span>
                      </div>
                    )}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setLightbox({ photoPath: r.photo_path, cropUrl: r.crop_url, similarity: r.similarity }) }}
                    className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/70 text-white/70 opacity-0 transition-all hover:bg-black/90 hover:text-white group-hover/thumb:opacity-100"
                    title="View full photo"
                  >
                    <Maximize2 size={10} />
                  </button>
                </div>
              )
            })}
          </div>

          <div ref={sentinelRef} className="flex h-16 items-center justify-center text-[11px] text-white/20">
            {shown < allResults.length ? 'Loading more…' : ''}
          </div>
        </>
      )}

      {lightbox && <SeedLightbox lightbox={lightbox} onClose={() => setLightbox(null)} />}
    </Container>
  )
}

// Side-by-side: full photo + matched crop + similarity %. Specific to this
// page's "verify a match" workflow — kept custom rather than reusing the
// general PhotoLightbox, which has a different layout/job.
function SeedLightbox({ lightbox, onClose }) {
  useEscToClose(onClose)
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 p-6" onClick={onClose}>
      <div className="relative flex w-full max-w-5xl items-start gap-4" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-3 -top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X size={14} />
        </button>
        <div className="min-w-0 flex-1">
          {isVideo(lightbox.photoPath) ? (
            <video src={`/api/media/${lightbox.photoPath}`} controls className="max-h-[80vh] w-full rounded-lg" />
          ) : (
            <img src={`/api/media/${lightbox.photoPath}`} alt="" className="max-h-[80vh] w-full rounded-lg object-contain" />
          )}
          <p className="mt-2 break-all text-[11px] text-white/30">{lightbox.photoPath}</p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <img src={lightbox.cropUrl} alt="" className="h-40 w-40 rounded-lg object-cover ring-2 ring-white/20" />
          <span className="text-[12px] text-white/50">{(lightbox.similarity * 100).toFixed(1)}% match</span>
        </div>
      </div>
    </div>
  )
}
