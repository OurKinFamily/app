import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { getClusters, getCluster, assignCluster, skipCluster, searchPeople, createPerson } from '../lib/api'
import { isVideo, mediaUrl } from '../lib/media'
import { Button } from '../components/Button'
import { Container } from '../components/Container'
import { Input } from '../components/Input'
import { Label } from '../components/Label'
import { Tag } from '../components/Tag'
import { EntityChip } from '../components/EntityChip'
import { Select } from '../components/Select'
import { SubheaderPortal } from '../components/SubheaderPortal'
import { HeaderTrailingPortal } from '../components/HeaderTrailingPortal'
import { MediaLightbox } from '../components/MediaLightbox'
import { MediaDetail } from '../components/MediaDetail'

const QUICK_PERSON_IDS = [
  'person-stephen',
  'person-stephen-sr',
  'person-patty',
  'person-david',
  'person-john-forrence',
]

const PAGE_SIZE = 50
const CROP_BATCH = 200

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
            className={
              'h-12 w-12 rounded bg-white/5 object-cover ' +
              (i > 0 ? 'hidden md:block' : '')
            }
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
  const [shown, setShown]       = useState(CROP_BATCH)
  const [searchResults, setSearchResults] = useState([])
  const [saving, setSaving]     = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  const [excluded, setExcluded] = useState(() => new Set())

  useEffect(() => {
    if (!cluster) return
    setExcluded(new Set())
    setShown(CROP_BATCH)
    getCluster(cluster.id).then(setDetail).catch(() => {})
  }, [cluster?.id])

  function buildAssignArgs() {
    if (!detail) return { exclude: [], include: [], handledKeys: new Set() }
    const visibleFaces = detail.faces.slice(0, shown)
    const include = visibleFaces
      .filter(f => !excluded.has(f.face_index))
      .map(f => [f.photo_path, f.face_index])
    const exclude = visibleFaces
      .filter(f => excluded.has(f.face_index))
      .map(f => [f.photo_path, f.face_index])
    // Composite key (photo_path|face_index) — face_index alone repeats across photos.
    const handledKeys = new Set(visibleFaces.map(f => `${f.photo_path}|${f.face_index}`))
    return { include, exclude, handledKeys }
  }

  function applyAssignToLocalState(args) {
    if (!args.handledKeys.size) return 0
    const count = args.handledKeys.size
    setDetail(d => d ? {
      ...d,
      faces: d.faces.filter(f => !args.handledKeys.has(`${f.photo_path}|${f.face_index}`)),
      size: (d.size || 0) - count,
    } : d)
    setExcluded(new Set())
    setShown(CROP_BATCH)
    return count
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
      const args = buildAssignArgs()
      await assignCluster(cluster.id, personId, args)
      const delta = applyAssignToLocalState(args)
      onAssigned(cluster.id, delta)
    } finally {
      setSaving(false)
    }
  }, [cluster?.id, saving, onAssigned, detail, excluded, shown])

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || saving) return
    setSaving(true)
    try {
      const person = await createPerson({ name: newName.trim() })
      const args = buildAssignArgs()
      await assignCluster(cluster.id, person.id, args)
      const delta = applyAssignToLocalState(args)
      setCreating(false)
      setNewName('')
      onAssigned(cluster.id, delta)
    } finally {
      setSaving(false)
    }
  }, [newName, saving, cluster?.id, onAssigned, detail, excluded, shown])

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
    <div className="hide-scrollbar flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto pb-28 md:pb-24">
      {!creating ? (
        <div className="space-y-3">
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

          <div className="fixed left-20 right-0 bottom-[var(--bottom-bar-h,3.5rem)] z-30 border-t border-white/10 bg-black/90 p-3 backdrop-blur md:left-[28rem] md:bottom-0">
            <Select
              dropUp
              options={searchResults}
              value={null}
              onChange={opt => handleAssign(opt.value)}
              onQueryChange={onSearch}
              placeholder="Search all people…"
            />
          </div>

          <div className="flex items-start justify-between">
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1 text-[12px] text-blue-400/70 transition-colors hover:text-blue-400"
            >
              <Plus size={12} /> Create new person
            </button>
            <Button variant="secondary" size="sm" onClick={handleSkip}>Skip</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>New person name</Label>
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Full name…"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving || !newName.trim()}>
              Create &amp; Assign
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="!mb-0">
              {detail
                ? (shown < detail.faces.length
                    ? `${shown.toLocaleString()} of ${detail.faces.length.toLocaleString()} crops`
                    : `${detail.faces.length.toLocaleString()} crops`)
                : 'Samples'}
            </Label>
            {excluded.size > 0 && <Tag tone="red">{excluded.size} excluded</Tag>}
            {!detail && <span className="text-[11px] text-white/30">loading…</span>}
          </div>
          {excluded.size > 0 && (
            <button onClick={() => setExcluded(new Set())} className="text-[11px] text-white/40 hover:text-white">
              clear
            </button>
          )}
        </div>
        <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(64px,1fr))]">
          {detail
            ? detail.faces.slice(0, shown).map((f, i) => {
                const ex = excluded.has(f.face_index)
                return (
                  <div key={i} className="group/face relative aspect-square">
                    <button
                      onClick={() => f.photo_path && onOpenPhoto(detail.faces, i)}
                      className={
                        'block h-full w-full overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50 ' +
                        (ex ? 'opacity-30 ring-1 ring-red-500/60' : '')
                      }
                      title="Open original photo"
                    >
                      <img
                        src={f.crop_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full bg-white/5 object-cover transition-opacity hover:opacity-80"
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
                <img key={i} src={url} alt="" loading="lazy" className="aspect-square w-full rounded bg-white/5 object-cover" />
              ))
          }
        </div>
        {detail && shown < detail.faces.length && (
          <button
            onClick={() => setShown(s => s + CROP_BATCH)}
            className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            Show {Math.min(CROP_BATCH, detail.faces.length - shown)} more ({(detail.faces.length - shown).toLocaleString()} remaining)
          </button>
        )}
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

  // Skip removes the cluster entirely; assign drains it (stay selected).
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

  const drainCluster = useCallback((clusterId, delta) => {
    if (!delta) return
    setClusters(prev => {
      const updated = prev.map(c => c.id === clusterId ? { ...c, size: Math.max(0, c.size - delta) } : c)
      const next    = updated.filter(c => c.size > 0)
      // If the just-drained cluster is gone, jump selection to the same slot in
      // the new list (or the previous one as fallback).
      const removedIdx = updated.findIndex(c => c.id === clusterId && c.size <= 0)
      if (removedIdx >= 0) {
        setSelected(next[removedIdx] || next[removedIdx - 1] || next[0] || null)
      } else {
        setSelected(old => old?.id === clusterId ? { ...old, size: Math.max(0, old.size - delta) } : old)
      }
      return next
    })
  }, [])

  const handleOpenPhoto = useCallback((faces, index) => {
    const seen = new Set()
    const photos = []
    let adjustedIndex = 0
    faces.forEach((f, i) => {
      if (!f.photo_path) return
      const path = f.photo_path.startsWith('/photos/') ? f.photo_path.slice('/photos/'.length) : f.photo_path
      if (seen.has(path)) return
      if (i === index) adjustedIndex = photos.length
      seen.add(path)
      photos.push({ path, url: `/api/media/${path}`, is_video: isVideo(path) })
    })
    setViewer({ photos, index: adjustedIndex })
  }, [])

  return (
    <>
      <SubheaderPortal>
        <h1 className="text-sm font-medium text-white/80">Unassigned Faces</h1>
      </SubheaderPortal>
      <HeaderTrailingPortal>
        {!loading && <Tag tone="amber">{total.toLocaleString()} remaining</Tag>}
      </HeaderTrailingPortal>

      {viewer && (
        <MediaLightbox
          items={viewer.photos}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
          renderDetail={(it, ctx, v) => <MediaDetail key={`${it.path}-${v}`} item={it} ctx={ctx} />}
        />
      )}

      <div className="flex h-[calc(100vh-var(--app-header-h,3rem)-4rem)] md:h-[calc(100vh-var(--app-header-h,3rem))]">
        {/* Cluster sidebar */}
        <aside className="flex w-20 shrink-0 flex-col border-r border-white/5 md:w-56">
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
        </aside>

        {/* Main pane */}
        <main className="flex flex-1 overflow-hidden">
          <Container className="flex flex-1 py-6">
            <AssignPanel
              key={selected?.id ?? 'none'}
              cluster={selected}
              quickPeople={quickPeople}
              onAssigned={drainCluster}
              onSkipped={removeCluster}
              onOpenPhoto={handleOpenPhoto}
            />
          </Container>
        </main>
      </div>
    </>
  )
}
