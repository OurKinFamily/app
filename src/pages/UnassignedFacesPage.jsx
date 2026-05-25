import { useState, useEffect, useCallback, useRef } from 'react'
import { getClusters, getCluster, assignCluster, skipCluster, searchPeople, createPerson } from '../lib/api'
import { PhotoViewer } from '../components/PhotoViewer'
import { isVideo } from '../lib/media'

const QUICK_PERSON_IDS = [
  'person-stephen',
  'person-stephen-sr',
  'person-patty',
  'person-david',
  'person-john-forrence',
]

const PAGE_SIZE = 50

function ClusterCard({ cluster, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border transition-colors p-2 ${
        isSelected
          ? 'border-blue-500/60 bg-blue-500/10'
          : 'border-white/5 bg-white/3 hover:border-white/15 hover:bg-white/5'
      }`}
    >
      <div className="flex gap-1 mb-1.5">
        {cluster.samples.slice(0, 4).map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            loading="lazy"
            className="w-12 h-12 rounded object-cover bg-white/5"
            onError={e => { e.target.style.display = 'none' }}
          />
        ))}
        {cluster.samples.length === 0 && (
          <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center text-white/20 text-xs">?</div>
        )}
      </div>
      <div className="text-[11px] text-white/40">{cluster.size} face{cluster.size !== 1 ? 's' : ''}</div>
    </button>
  )
}

function QuickChip({ person, onAssign, disabled }) {
  return (
    <button
      onMouseDown={() => onAssign(person.id)}
      disabled={disabled}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-colors disabled:opacity-40"
    >
      {person.avatar
        ? <img src={`/api/media/${person.avatar}`} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
        : <div className="w-5 h-5 rounded-full bg-white/15 shrink-0" />
      }
      <span className="text-[12px] text-white/80 whitespace-nowrap">
        {person.known_as || person.name.split(' ')[0]}
      </span>
    </button>
  )
}

function AssignPanel({ cluster, quickPeople, onAssigned, onSkipped, onOpenPhoto }) {
  const [detail, setDetail]     = useState(null)
  const [query, setQuery]       = useState('')
  const [suggestions, setSugg]  = useState([])
  const [showSugg, setShowSugg] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')

  useEffect(() => {
    if (!cluster) return
    getCluster(cluster.id).then(setDetail).catch(() => {})
  }, [cluster?.id])

  useEffect(() => {
    if (!query.trim()) { setSugg([]); return }
    const t = setTimeout(async () => {
      const results = await searchPeople(query).catch(() => [])
      setSugg(results)
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  const handleAssign = useCallback(async (personId) => {
    if (saving) return
    setSaving(true)
    try {
      await assignCluster(cluster.id, personId)
      onAssigned(cluster.id)
    } finally {
      setSaving(false)
    }
  }, [cluster?.id, saving, onAssigned])

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || saving) return
    setSaving(true)
    try {
      const person = await createPerson({ name: newName.trim() })
      await assignCluster(cluster.id, person.id)
      onAssigned(cluster.id)
    } finally {
      setSaving(false)
    }
  }, [newName, saving, cluster?.id, onAssigned])

  const handleSkip = useCallback(async () => {
    await skipCluster(cluster.id)
    onSkipped(cluster.id)
  }, [cluster?.id, onSkipped])

  if (!cluster) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
        Select a cluster to identify
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-5 overflow-y-auto pr-2">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-white">
          Cluster #{cluster.id} — {cluster.size} face{cluster.size !== 1 ? 's' : ''}
        </h2>
        <button
          onClick={handleSkip}
          className="text-[12px] text-white/30 hover:text-white/60 px-2 py-1 rounded border border-white/10 hover:border-white/20 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Assign section (above crops) */}
      {!creating ? (
        <div className="space-y-3">
          <label className="text-[11px] text-white/40 uppercase tracking-wider">Assign to person</label>

          {/* Quick chips */}
          {quickPeople.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quickPeople.map(p => (
                <QuickChip key={p.id} person={p} onAssign={handleAssign} disabled={saving} />
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setShowSugg(true) }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              placeholder="Search all people…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/25 outline-none focus:border-white/25"
            />
            {showSugg && suggestions.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden z-20 shadow-xl max-h-52 overflow-y-auto">
                {suggestions.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={() => handleAssign(p.id)}
                    disabled={saving}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/70 hover:bg-white/5 hover:text-white text-left"
                  >
                    {p.avatar
                      ? <img src={`/api/media/${p.avatar}`} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      : <div className="w-6 h-6 rounded-full bg-white/10 shrink-0" />
                    }
                    <span>
                      {p.known_as && <span className="text-white/40 mr-1">({p.known_as})</span>}
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setCreating(true)}
            className="text-[12px] text-blue-400/70 hover:text-blue-400 transition-colors"
          >
            + Create new person
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-[11px] text-white/40 uppercase tracking-wider">New person name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Full name…"
              autoFocus
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/25 outline-none focus:border-white/25"
            />
            <button
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] disabled:opacity-40 transition-colors"
            >
              Create & Assign
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-3 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white text-[13px] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Face crops */}
      <div>
        <div className="text-[11px] text-white/30 mb-2 uppercase tracking-wider">
          {detail ? `${detail.faces.length} crops` : 'Samples'}
          {!detail && <span className="ml-1 opacity-50">(loading…)</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {detail
            ? detail.faces.map((f, i) => (
                <button
                  key={i}
                  onClick={() => f.photo_path && onOpenPhoto(detail.faces, i)}
                  className="rounded overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  title="Open original photo"
                >
                  <img
                    src={f.crop_url}
                    alt=""
                    className="w-16 h-16 object-cover bg-white/5 hover:opacity-80 transition-opacity"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </button>
              ))
            : cluster.samples.map((url, i) => (
                <img key={i} src={url} alt="" className="w-16 h-16 rounded object-cover bg-white/5" />
              ))
          }
        </div>
      </div>

    </div>
  )
}

export function UnassignedFacesPage() {
  const [clusters, setClusters]   = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]     = useState(false)
  const [selected, setSelected]   = useState(null)
  const [quickPeople, setQuickPeople] = useState([])
  const [viewer, setViewer]           = useState(null) // { photos, index }
  const offsetRef = useRef(0)
  const sentinelRef = useRef(null)

  // Fetch quick-select family members
  useEffect(() => {
    Promise.all(
      QUICK_PERSON_IDS.map(id =>
        fetch(`/api/people/${id}`).then(r => r.ok ? r.json() : null).catch(() => null)
      )
    ).then(results => setQuickPeople(results.filter(Boolean)))
  }, [])

  const loadPage = useCallback(async (offset, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const data = await getClusters('unassigned', PAGE_SIZE, offset)
      setClusters(prev => append ? [...prev, ...data.clusters] : data.clusters)
      setTotal(data.total)
      setHasMore(offset + PAGE_SIZE < data.total)
      offsetRef.current = offset + data.clusters.length
      if (!append) {
        setSelected(null)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { loadPage(0) }, [loadPage])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loadingMore) {
        loadPage(offsetRef.current, true)
      }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loadPage])

  const removeCluster = useCallback((clusterId) => {
    setClusters(prev => {
      const idx = prev.findIndex(c => c.id === clusterId)
      const next = prev.filter(c => c.id !== clusterId)
      setSelected(old => {
        if (old?.id !== clusterId) return old
        return next[idx] || next[idx - 1] || next[0] || null
      })
      return next
    })
    setTotal(t => t - 1)
  }, [])

  const handleOpenPhoto = useCallback((faces, index) => {
    // Build unique-by-path photo list; keep clicked index aligned
    const seen = new Set()
    const photos = []
    let adjustedIndex = 0
    faces.forEach((f, i) => {
      if (!f.photo_path || seen.has(f.photo_path)) return
      if (i === index) adjustedIndex = photos.length
      seen.add(f.photo_path)
      photos.push({ path: f.photo_path, url: `/api/media/${f.photo_path}`, is_video: isVideo(f.photo_path) })
    })
    setViewer({ photos, index: adjustedIndex })
  }, [])

  return (
    <>
    {viewer && (
      <PhotoViewer
        photos={viewer.photos}
        initialIndex={viewer.index}
        onClose={() => setViewer(null)}
        onNeedMore={() => {}}
        onNavigate={() => {}}
      />
    )}
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Cluster list */}
      <div className="w-56 shrink-0 border-r border-white/5 flex flex-col">
        <div className="px-4 pt-6 pb-3 border-b border-white/5">
          <h1 className="text-sm font-semibold text-white">Unassigned Clusters</h1>
          <p className="text-[11px] text-white/30 mt-0.5">
            {loading ? '…' : `${total} remaining`}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading && <p className="text-white/20 text-xs p-2">Loading…</p>}
          {!loading && clusters.length === 0 && (
            <p className="text-white/20 text-xs p-2">All done!</p>
          )}
          {clusters.map(c => (
            <ClusterCard
              key={c.id}
              cluster={c}
              isSelected={selected?.id === c.id}
              onClick={() => setSelected(c)}
            />
          ))}
          <div ref={sentinelRef} className="py-2 text-center">
            {loadingMore && <span className="text-[11px] text-white/20">Loading…</span>}
          </div>
        </div>
      </div>

      {/* Assignment panel */}
      <div className="flex-1 p-6 flex overflow-hidden">
        <AssignPanel
          key={selected?.id ?? 'none'}
          cluster={selected}
          quickPeople={quickPeople}
          onAssigned={removeCluster}
          onSkipped={removeCluster}
          onOpenPhoto={handleOpenPhoto}
        />
      </div>
    </div>
    </>
  )
}
