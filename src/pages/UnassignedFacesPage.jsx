import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { getClusters, getCluster, assignCluster, skipCluster, searchPeople, createPerson } from '../lib/api'
import { isVideo, mediaUrl } from '../lib/media'
import { Button } from '../components/new/Button'
import { Input } from '../components/new/Input'
import { EntityChip } from '../components/new/EntityChip'
import { Select } from '../components/new/Select'
import { PhotoLightbox } from '../components/new/PhotoLightbox'

const QUICK_PERSON_IDS = [
  'person-stephen',
  'person-stephen-sr',
  'person-patty',
  'person-david',
  'person-john-forrence',
]

const PAGE_SIZE = 50

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

function ClusterCard({ cluster, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        'w-full rounded-lg border p-2 text-left transition-colors ' +
        (isSelected
          ? 'border-blue-500/60 bg-blue-500/10'
          : 'border-white/8 bg-white/5 hover:border-white/15 hover:bg-white/8')
      }
    >
      <div className="mb-1.5 flex gap-1">
        {cluster.samples.slice(0, 4).map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            loading="lazy"
            className="h-12 w-12 rounded bg-white/5 object-cover"
            onError={e => { e.target.style.display = 'none' }}
          />
        ))}
        {cluster.samples.length === 0 && (
          <div className="flex h-12 w-12 items-center justify-center rounded bg-white/5 text-xs text-white/20">?</div>
        )}
      </div>
      <div className="text-[11px] text-white/40">{cluster.size} face{cluster.size !== 1 ? 's' : ''}</div>
    </button>
  )
}

function AssignPanel({ cluster, quickPeople, onAssigned, onSkipped, onOpenPhoto }) {
  const [detail, setDetail]     = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [saving, setSaving]     = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  // face_index of crops the user has excluded from this assignment.
  const [excluded, setExcluded] = useState(() => new Set())

  useEffect(() => {
    if (!cluster) return
    setExcluded(new Set())
    getCluster(cluster.id).then(setDetail).catch(() => {})
  }, [cluster?.id])

  function buildExcludeList() {
    if (!detail || excluded.size === 0) return []
    return detail.faces
      .filter(f => excluded.has(f.face_index))
      .map(f => [f.photo_path, f.face_index])
  }

  function toggleExcluded(faceIndex) {
    setExcluded(prev => {
      const next = new Set(prev)
      next.has(faceIndex) ? next.delete(faceIndex) : next.add(faceIndex)
      return next
    })
  }

  const onSearch = async q => {
    if (!q.trim()) { setSearchResults([]); return }
    try {
      const r = await searchPeople(q)
      setSearchResults(r.map(personToOption))
    } catch { setSearchResults([]) }
  }

  const handleAssign = useCallback(async (personId) => {
    if (saving) return
    setSaving(true)
    try {
      await assignCluster(cluster.id, personId, buildExcludeList())
      onAssigned(cluster.id)
    } finally {
      setSaving(false)
    }
  }, [cluster?.id, saving, onAssigned, detail, excluded])

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || saving) return
    setSaving(true)
    try {
      const person = await createPerson({ name: newName.trim() })
      await assignCluster(cluster.id, person.id, buildExcludeList())
      onAssigned(cluster.id)
    } finally {
      setSaving(false)
    }
  }, [newName, saving, cluster?.id, onAssigned, detail, excluded])

  const handleSkip = useCallback(async () => {
    await skipCluster(cluster.id)
    onSkipped(cluster.id)
  }, [cluster?.id, onSkipped])

  if (!cluster) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-white/20">
        Select a cluster to identify
      </div>
    )
  }

  return (
    <div className="hide-scrollbar flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto pr-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-white">
          Cluster #{cluster.id} — {cluster.size} face{cluster.size !== 1 ? 's' : ''}
        </h2>
        <Button variant="secondary" size="sm" onClick={handleSkip}>Skip</Button>
      </div>

      {!creating ? (
        <div className="space-y-3">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Assign to person</label>

          {quickPeople.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quickPeople.map(p => (
                <EntityChip
                  key={p.id}
                  avatar={p.avatar ? mediaUrl(p.avatar) : null}
                  initials
                  text={p.known_as || p.name.split(' ')[0]}
                  onClick={() => handleAssign(p.id)}
                />
              ))}
            </div>
          )}

          <Select
            options={searchResults}
            value={null}
            onChange={opt => handleAssign(opt.value)}
            onQueryChange={onSearch}
            placeholder="Search all people…"
          />

          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 text-[12px] text-blue-400/70 transition-colors hover:text-blue-400"
          >
            <Plus size={12} /> Create new person
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">New person name</label>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Full name…"
              autoFocus
            />
            <Button size="sm" onClick={handleCreate} disabled={saving || !newName.trim()}>
              Create &amp; Assign
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-white/40">
          <span>
            {detail ? `${detail.faces.length} crops` : 'Samples'}
            {!detail && <span className="ml-1 opacity-50">(loading…)</span>}
            {excluded.size > 0 && <span className="ml-2 text-red-400/70 normal-case">· {excluded.size} excluded</span>}
          </span>
          {excluded.size > 0 && (
            <button onClick={() => setExcluded(new Set())} className="text-[10px] normal-case text-white/40 hover:text-white">
              clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {detail
            ? detail.faces.map((f, i) => {
                const ex = excluded.has(f.face_index)
                return (
                  <div key={i} className="group/face relative">
                    <button
                      onClick={() => f.photo_path && onOpenPhoto(detail.faces, i)}
                      className={
                        'overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50 ' +
                        (ex ? 'opacity-30 ring-1 ring-red-500/60' : '')
                      }
                      title="Open original photo"
                    >
                      <img
                        src={f.crop_url}
                        alt=""
                        className="h-16 w-16 bg-white/5 object-cover transition-opacity hover:opacity-80"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExcluded(f.face_index)}
                      aria-label={ex ? 'Include face' : 'Exclude face'}
                      className={
                        'absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-zinc-700 transition-colors ' +
                        (ex
                          ? 'bg-red-500 text-white opacity-100'
                          : 'bg-zinc-900 text-white/60 opacity-0 hover:bg-red-500 hover:text-white group-hover/face:opacity-100')
                      }
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </div>
                )
              })
            : cluster.samples.map((url, i) => (
                <img key={i} src={url} alt="" className="h-16 w-16 rounded bg-white/5 object-cover" />
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
  const [viewer, setViewer]           = useState(null)
  const offsetRef = useRef(0)
  const sentinelRef = useRef(null)

  useEffect(() => {
    Promise.all(
      QUICK_PERSON_IDS.map(id =>
        fetch(`/api/people/${id}`).then(r => r.ok ? r.json() : null).catch(() => null),
      ),
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
      if (!append) setSelected(null)
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
        <PhotoLightbox
          items={viewer.photos}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      )}
      <div className="flex h-[calc(100vh-var(--app-header-h,3rem))]">
        {/* Cluster list */}
        <div className="flex w-56 shrink-0 flex-col border-r border-white/5">
          <div className="border-b border-white/5 px-4 pb-3 pt-6">
            <h1 className="text-sm font-semibold text-white">Unassigned Clusters</h1>
            <p className="mt-0.5 text-[11px] text-white/30">
              {loading ? '…' : `${total} remaining`}
            </p>
          </div>
          <div className="hide-scrollbar flex-1 space-y-1.5 overflow-y-auto p-2">
            {loading && <p className="p-2 text-xs text-white/20">Loading…</p>}
            {!loading && clusters.length === 0 && (
              <p className="p-2 text-xs text-white/20">All done!</p>
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
        <div className="flex flex-1 overflow-hidden p-6">
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
