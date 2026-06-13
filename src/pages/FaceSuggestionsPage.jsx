import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { RefreshCw, Check, X, UserPlus, Search, EyeOff, Maximize2, LayoutGrid } from 'lucide-react'
import { getGroupedSuggestions, assignCluster, assignClustersBulk, rejectFaces, createPerson, searchPeople, skipCluster, getLeftoverClusters, getCluster } from '../lib/api'
import { mediaUrl, isVideo } from '../lib/media'
import { Container } from '../components/Container'
import { Button } from '../components/Button'
import { Avatar } from '../components/Avatar'
import { Select } from '../components/Select'
import { MediaLightbox } from '../components/MediaLightbox'
import { useToast } from '../components/Toast'

const DEFAULT_THRESHOLD = 0.80
const DEFAULT_MARGIN = 0.05
const DEFAULT_LIMIT = 100

function avatarSrc(avatar) {
  if (!avatar) return null
  return avatar.startsWith('/api/') ? avatar : mediaUrl(avatar)
}

// Page-level lightbox opener — any card can call it to open a photo in lightbox
// instead of downloading via the raw /api/media URL. Provider lives at the
// FaceSuggestionsPage root.
const OpenPhotoContext = createContext(null)
function useOpenPhoto() { return useContext(OpenPhotoContext) }

const TARGET_THUMBS = 60

// Round-robin pull samples across clusters so every cluster contributes at
// least one thumbnail. Sample shape from the API is now {crop_url, photo_path}.
function pickThumbs(clusters, target = TARGET_THUMBS) {
  const queues = clusters.map(c => ({
    cluster_id: c.cluster_id,
    similarity: c.similarity,
    n_faces:    c.n_faces,
    samples:    [...(c.samples || [])],
  }))
  const out = []
  while (out.length < target) {
    let added = 0
    for (const q of queues) {
      if (q.samples.length === 0) continue
      const s = q.samples.shift()
      // Accept legacy string-only samples from other endpoints
      const crop_url = typeof s === 'string' ? s : s?.crop_url
      const photo_path = typeof s === 'string' ? null : s?.photo_path
      out.push({
        cluster_id: q.cluster_id,
        similarity: q.similarity,
        n_faces:    q.n_faces,
        crop_url,
        photo_path,
      })
      added++
      if (out.length >= target) break
    }
    if (added === 0) break
  }
  return out
}

function GroupCard({ group, onConfirm, onDismiss, onInspect, busy }) {
  const openPhoto = useOpenPhoto()
  const [excluded, setExcluded] = useState(() => new Set())
  const [showAll, setShowAll] = useState(false)
  const pct = Math.round((group.avg_similarity || 0) * 100)
  // Collapsed: preview a handful. Expanded: one thumb per cluster so every
  // face can be eyeballed before confirming (singletons are weak evidence).
  const thumbs = pickThumbs(group.clusters, showAll ? Infinity : TARGET_THUMBS)
  const shownClusterIds = new Set(thumbs.map(t => t.cluster_id))
  const hiddenClusters = group.clusters.length - shownClusterIds.size

  const toggle = (cid) => {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(cid)) next.delete(cid)
      else next.add(cid)
      return next
    })
  }

  const activeClusters = group.clusters.filter(c => !excluded.has(c.cluster_id))
  const activeFaces = activeClusters.reduce((sum, c) => sum + c.n_faces, 0)
  const excludedFaces = group.n_faces - activeFaces

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <Avatar src={avatarSrc(group.person_avatar)} name={group.person_name} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <div className="text-lg font-medium">
              {group.person_name}
              {group.person_known_as && (
                <span className="ml-2 text-sm font-normal text-white/40">({group.person_known_as})</span>
              )}
            </div>
            <div className="text-xs text-white/40">
              {group.person_n_total.toLocaleString()} already confirmed
            </div>
          </div>
          <div className="mt-1 text-sm text-white/70">
            <span className="font-medium text-white">{group.n_faces.toLocaleString()}</span> new face{group.n_faces !== 1 ? 's' : ''}
            <span className="text-white/40"> · </span>
            <span>{group.n_clusters} cluster{group.n_clusters !== 1 ? 's' : ''}</span>
            <span className="text-white/40"> · </span>
            <span className="text-white/60">{pct}% confidence avg</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {thumbs.map((t, i) => {
              const isExcluded = excluded.has(t.cluster_id)
              const cPct = Math.round((t.similarity || 0) * 100)
              return (
                <div
                  key={`${t.cluster_id}-${i}`}
                  className="relative shrink-0 group"
                >
                  <button
                    type="button"
                    onClick={() => toggle(t.cluster_id)}
                    title={`cluster ${t.cluster_id} · ${t.n_faces} face${t.n_faces !== 1 ? 's' : ''} · ${cPct}% — click to ${isExcluded ? 'include' : 'exclude'} this cluster`}
                    className={`block rounded ring-1 transition ${
                      isExcluded
                        ? 'opacity-40 ring-red-500/60 grayscale'
                        : 'ring-white/10 hover:ring-emerald-400/60'
                    }`}
                  >
                    {t.crop_url ? (
                      <img
                        src={t.crop_url}
                        alt=""
                        loading="lazy"
                        className="h-16 w-16 rounded bg-white/5 object-cover"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-white/5 text-xs text-white/30">?</div>
                    )}
                    {isExcluded && (
                      <span className="absolute inset-0 flex items-center justify-center rounded bg-black/30">
                        <X className="h-6 w-6 text-red-300" />
                      </span>
                    )}
                  </button>
                  <span className="pointer-events-none absolute -top-1 -right-1 rounded bg-black/80 px-1 text-[10px] font-medium tabular-nums text-white/90">
                    {cPct}%
                  </span>
                  {t.photo_path && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); openPhoto && openPhoto(t.photo_path) }}
                      title="open original photo"
                      className="absolute top-1 left-1 rounded bg-black/70 p-0.5 text-white/80 opacity-0 transition-opacity hover:bg-black hover:text-white group-hover:opacity-100"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  )}
                  {onInspect && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onInspect(t.cluster_id, group.person_id, group.person_name) }}
                      title={`inspect all ${t.n_faces} faces in this cluster`}
                      className="absolute bottom-1 left-1 rounded bg-black/70 p-0.5 text-white/80 opacity-0 transition-opacity hover:bg-black hover:text-white group-hover:opacity-100"
                    >
                      <LayoutGrid className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
            {hiddenClusters > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="flex h-16 items-center justify-center rounded bg-white/5 px-3 text-xs text-white/60 ring-1 ring-white/10 hover:bg-white/10 hover:text-white/90"
                title={`Show all ${group.clusters.length} clusters`}
              >
                +{hiddenClusters} more — show all
              </button>
            )}
            {showAll && group.clusters.length > TARGET_THUMBS && (
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="flex h-16 items-center justify-center rounded bg-white/5 px-3 text-xs text-white/60 ring-1 ring-white/10 hover:bg-white/10 hover:text-white/90"
              >
                show less
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => onConfirm(activeClusters)}
              disabled={busy || activeClusters.length === 0}
              className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Confirm {activeFaces.toLocaleString()} face{activeFaces !== 1 ? 's' : ''}
              {excludedFaces > 0 && (
                <span className="ml-2 text-xs text-white/40">({excludedFaces} excluded)</span>
              )}
            </Button>
            <Button onClick={onDismiss} disabled={busy} className="bg-white/5 text-white/60 hover:bg-white/10">
              <X className="mr-1.5 h-4 w-4" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function personToOption(p) {
  return {
    value: p.id,
    text: p.known_as || p.name,
    fullName: p.name,
    avatar: p.avatar ? mediaUrl(p.avatar) : null,
    initials: true,
    label: p.name,
  }
}

function UnknownCandidateCard({ candidate, onCreate, onAssignExisting, onDismiss, onSkipForever, onSamePersonUnknown, onInspect, busy }) {
  const openPhoto = useOpenPhoto()
  const thumbs = pickThumbs(candidate.clusters, TARGET_THUMBS)
  const shownClusterIds = new Set(thumbs.map(t => t.cluster_id))
  const hiddenClusters = candidate.n_clusters - shownClusterIds.size
  const interPct = Math.round((candidate.avg_inter_similarity || 0) * 100)
  const [mode, setMode] = useState(null)   // null | 'create' | 'assign'
  const [name, setName] = useState('')
  const [people, setPeople] = useState([])

  const handleSearch = async (q) => {
    if (!q || q.length < 2) return setPeople([])
    try {
      const list = await searchPeople(q)
      setPeople(list.map(personToOption))
    } catch {
      setPeople([])
    }
  }

  return (
    <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-2xl font-medium text-amber-300">
          ?
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <div className="text-lg font-medium text-amber-200">Unknown person</div>
            <div className="text-xs text-white/40">
              {candidate.n_clusters} clusters · {candidate.n_faces} faces · {interPct}% inter-cluster
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {thumbs.map((t, i) => (
              <div
                key={`${t.cluster_id}-${i}`}
                title={`cluster ${t.cluster_id} · ${t.n_faces} face${t.n_faces !== 1 ? 's' : ''}`}
                className="relative shrink-0 group"
              >
                {t.crop_url ? (
                  <img
                    src={t.crop_url}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 rounded bg-white/5 object-cover ring-1 ring-white/10"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded bg-white/5 text-xs text-white/30 ring-1 ring-white/10">?</div>
                )}
                <span className="pointer-events-none absolute -bottom-1 -right-1 rounded bg-black/70 px-1 text-[10px] tabular-nums text-white/70">
                  {t.n_faces}
                </span>
                {t.photo_path && (
                  <button
                    type="button"
                    onClick={() => openPhoto && openPhoto(t.photo_path)}
                    title="open original photo"
                    className="absolute top-1 left-1 rounded bg-black/70 p-0.5 text-white/80 opacity-0 transition-opacity hover:bg-black hover:text-white group-hover:opacity-100"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                )}
                {onInspect && (
                  <button
                    type="button"
                    onClick={() => onInspect(t.cluster_id)}
                    title={`inspect all ${t.n_faces} faces in this cluster`}
                    className="absolute bottom-1 left-1 rounded bg-black/70 p-0.5 text-white/80 opacity-0 transition-opacity hover:bg-black hover:text-white group-hover:opacity-100"
                  >
                    <LayoutGrid className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {hiddenClusters > 0 && (
              <div className="flex h-16 items-center justify-center rounded bg-white/5 px-3 text-xs text-white/50 ring-1 ring-white/10">
                +{hiddenClusters} clusters
              </div>
            )}
          </div>

          {mode === null && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => setMode('create')} disabled={busy} className="bg-amber-500/20 text-amber-200 hover:bg-amber-500/30">
                <UserPlus className="mr-1.5 h-4 w-4" />
                Create new person
              </Button>
              <Button
                onClick={onSamePersonUnknown}
                disabled={busy}
                title="Link these clusters under a placeholder identity. Rename later when you find out who it is."
                className="bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
              >
                <Check className="mr-1.5 h-4 w-4" />
                Same person (no name yet)
              </Button>
              <Button onClick={() => setMode('assign')} disabled={busy} className="bg-white/5 text-white/70 hover:bg-white/10">
                <Search className="mr-1.5 h-4 w-4" />
                Assign to existing
              </Button>
              <Button
                onClick={onDismiss}
                disabled={busy}
                title="Hide this candidate from this session only. Comes back on reload."
                className="bg-white/5 text-white/50 hover:bg-white/10"
              >
                <EyeOff className="mr-1.5 h-4 w-4" />
                Skip for now
              </Button>
              <Button
                onClick={onSkipForever}
                disabled={busy}
                title="Permanently skip these clusters. They won't appear in suggestions or /unassigned again."
                className="bg-red-500/15 text-red-300 hover:bg-red-500/25"
              >
                <X className="mr-1.5 h-4 w-4" />
                Skip forever
              </Button>
            </div>
          )}

          {mode === 'create' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreate(candidate, name.trim()) }}
                placeholder="Full name (e.g. Sarah Johnson)"
                className="flex-1 min-w-[200px] rounded bg-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:bg-white/15 focus:outline-none"
              />
              <Button
                onClick={() => name.trim() && onCreate(candidate, name.trim())}
                disabled={busy || !name.trim()}
                className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
              >
                <Check className="mr-1.5 h-4 w-4" />
                Create &amp; assign {candidate.n_faces} face{candidate.n_faces !== 1 ? 's' : ''}
              </Button>
              <Button onClick={() => { setMode(null); setName('') }} disabled={busy} className="bg-white/5 text-white/50 hover:bg-white/10">
                Cancel
              </Button>
            </div>
          )}

          {mode === 'assign' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[260px]">
                <Select
                  options={people}
                  onQueryChange={handleSearch}
                  onChange={(opt) => opt && onAssignExisting(candidate, opt.value, opt.fullName || opt.text)}
                  placeholder="Search people…"
                  autoFocus
                />
              </div>
              <Button onClick={() => setMode(null)} disabled={busy} className="bg-white/5 text-white/50 hover:bg-white/10">
                Cancel
              </Button>
            </div>
          )}
        </div>

        {candidate.maybe_candidates?.length > 0 && (
          <div className="shrink-0 w-44 border-l border-amber-500/20 pl-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-amber-300/60">
              Maybe?
            </div>
            <div className="flex flex-col gap-1.5">
              {candidate.maybe_candidates.map(m => (
                <button
                  key={m.person_id}
                  onClick={() => onAssignExisting(candidate, m.person_id, m.person_name)}
                  disabled={busy}
                  title={`Combined centroid matches ${m.person_name} at ${Math.round(m.similarity * 100)}% · brain has ${m.n_total.toLocaleString()} faces`}
                  className="flex items-center justify-between rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-left text-xs text-amber-100 hover:border-amber-400/60 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  <span className="truncate font-medium">{m.person_name}</span>
                  <span className="ml-2 shrink-0 tabular-nums text-amber-300/70">
                    {Math.round(m.similarity * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LeftoverClusterRow({ cluster, onAssign, onCreate, onSkipForever, onSamePersonUnknown, onInspect, busy }) {
  const openPhoto = useOpenPhoto()
  const samples = (cluster.samples || []).slice(0, 6)
  const [mode, setMode] = useState(null)
  const [name, setName] = useState('')
  const [people, setPeople] = useState([])

  const handleSearch = async (q) => {
    if (!q || q.length < 2) return setPeople([])
    try {
      const list = await searchPeople(q)
      setPeople(list.map(personToOption))
    } catch {
      setPeople([])
    }
  }

  const bc = cluster.best_candidate

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex flex-col items-start gap-3 md:flex-row">
        <div className="flex shrink-0 flex-wrap gap-1">
          {samples.map((s, i) => {
            const crop_url = typeof s === 'string' ? s : s?.crop_url
            const photo_path = typeof s === 'string' ? null : s?.photo_path
            return (
              <div key={i} className="relative group">
                {crop_url ? (
                  <img
                    src={crop_url}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 rounded bg-white/5 object-cover ring-1 ring-white/10"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-white/5 text-xs text-white/30 ring-1 ring-white/10">?</div>
                )}
                {photo_path && (
                  <button
                    type="button"
                    onClick={() => openPhoto && openPhoto(photo_path)}
                    title="open original photo"
                    className="absolute top-0.5 left-0.5 rounded bg-black/70 p-0.5 text-white/80 opacity-0 transition-opacity hover:bg-black hover:text-white group-hover:opacity-100"
                  >
                    <Maximize2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white/40">
            cluster {cluster.cluster_id} · {cluster.n_faces.toLocaleString()} face{cluster.n_faces !== 1 ? 's' : ''}
            {bc && (
              <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
                best guess: {bc.person_name}
                {bc.person_known_as && <span className="text-amber-300/60"> ({bc.person_known_as})</span>}
                <span className="text-amber-300/70"> · {Math.round(bc.similarity * 100)}%</span>
              </span>
            )}
          </div>
          {mode === null && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {bc && (
                <Button
                  onClick={() => onAssign(cluster, bc.person_id, bc.person_name)}
                  disabled={busy}
                  size="sm"
                  className="bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Assign to {bc.person_name}
                  {bc.person_known_as && <span className="ml-1 opacity-70">({bc.person_known_as})</span>}
                </Button>
              )}
              <Button onClick={() => setMode('assign')} disabled={busy} size="sm" className="bg-white/5 text-white/70 hover:bg-white/10">
                <Search className="mr-1 h-3 w-3" />
                Pick person
              </Button>
              <Button onClick={() => setMode('create')} disabled={busy} size="sm" className="bg-white/5 text-white/70 hover:bg-white/10">
                <UserPlus className="mr-1 h-3 w-3" />
                Create new
              </Button>
              <Button onClick={onSamePersonUnknown} disabled={busy} size="sm" className="bg-white/5 text-white/70 hover:bg-white/10" title="Tag as a placeholder identity to revisit later.">
                Same person
              </Button>
              <Button onClick={onSkipForever} disabled={busy} size="sm" className="bg-red-500/10 text-red-300 hover:bg-red-500/20">
                <X className="mr-1 h-3 w-3" />
                Skip forever
              </Button>
              {onInspect && (
                <Button onClick={onInspect} disabled={busy} size="sm" className="bg-white/5 text-white/60 hover:bg-white/10">
                  <LayoutGrid className="mr-1 h-3 w-3" />
                  Inspect
                </Button>
              )}
            </div>
          )}
          {mode === 'create' && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreate(cluster, name.trim()) }}
                placeholder="Name"
                className="flex-1 min-w-[180px] rounded bg-white/10 px-3 py-1 text-sm text-white placeholder:text-white/30 focus:bg-white/15 focus:outline-none"
              />
              <Button
                onClick={() => name.trim() && onCreate(cluster, name.trim())}
                disabled={busy || !name.trim()}
                size="sm"
                className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
              >
                Create &amp; assign
              </Button>
              <Button onClick={() => { setMode(null); setName('') }} disabled={busy} size="sm" className="bg-white/5 text-white/50 hover:bg-white/10">
                Cancel
              </Button>
            </div>
          )}
          {mode === 'assign' && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[220px]">
                <Select
                  options={people}
                  onQueryChange={handleSearch}
                  onChange={(opt) => opt && onAssign(cluster, opt.value, opt.fullName || opt.text)}
                  placeholder="Search people…"
                  autoFocus
                />
              </div>
              <Button onClick={() => setMode(null)} disabled={busy} size="sm" className="bg-white/5 text-white/50 hover:bg-white/10">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AmbiguousCard({ entry, onPick, busy }) {
  const openPhoto = useOpenPhoto()
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex gap-3">
        <div className="flex flex-wrap gap-1">
          {(entry.samples || []).slice(0, 6).map((s, i) => {
            const crop_url = typeof s === 'string' ? s : s?.crop_url
            const photo_path = typeof s === 'string' ? null : s?.photo_path
            return (
              <div key={i} className="relative group">
                <img
                  src={crop_url}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 rounded bg-white/5 object-cover ring-1 ring-white/10"
                  onError={e => { e.target.style.display = 'none' }}
                />
                {photo_path && (
                  <button
                    type="button"
                    onClick={() => openPhoto && openPhoto(photo_path)}
                    title="open original photo"
                    className="absolute top-0.5 left-0.5 rounded bg-black/70 p-0.5 text-white/80 opacity-0 transition-opacity hover:bg-black hover:text-white group-hover:opacity-100"
                  >
                    <Maximize2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex-1">
          <div className="text-xs text-white/40">
            cluster {entry.cluster_id} · {entry.n_faces} face{entry.n_faces !== 1 ? 's' : ''}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.candidates.map(c => (
              <button
                key={c.person_id}
                onClick={() => onPick(entry, c)}
                disabled={busy}
                className="rounded border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80 hover:border-white/30 hover:bg-white/10 disabled:opacity-50"
              >
                {c.person_name} <span className="text-white/40">({Math.round(c.similarity * 100)}%)</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ClusterDetailModal({ clusterId, prefilledPersonId, prefilledPersonName, onClose, onAssigned }) {
  const { toast } = useToast()
  const openPhoto = useOpenPhoto()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [excluded, setExcluded] = useState(() => new Set())  // "photo_path|face_index"
  const [personId, setPersonId] = useState(prefilledPersonId || null)
  const [personName, setPersonName] = useState(prefilledPersonName || null)
  const [people, setPeople] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    getCluster(clusterId)
      .then(d => { if (alive) { setDetail(d); setLoading(false) } })
      .catch(e => { if (alive) { toast.error(`Failed to load cluster: ${e.message}`); setLoading(false) } })
    return () => { alive = false }
  }, [clusterId, toast])

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSearch = async (q) => {
    if (!q || q.length < 2) return setPeople([])
    try {
      const list = await searchPeople(q)
      setPeople(list.map(personToOption))
    } catch {
      setPeople([])
    }
  }

  const toggleFace = (f) => {
    const key = `${f.photo_path}|${f.face_index}`
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const faces = detail?.faces || []
  const includedFaces = faces.filter(f => !excluded.has(`${f.photo_path}|${f.face_index}`))
  const excludedFaces = faces.filter(f =>  excluded.has(`${f.photo_path}|${f.face_index}`))

  const assign = async () => {
    if (!personId) return toast.error('Pick a person first')
    if (includedFaces.length === 0) return toast.error('All faces excluded — nothing to assign')
    setBusy(true)
    try {
      const exclude = excludedFaces.map(f => [f.photo_path, f.face_index])
      await assignCluster(clusterId, personId, { exclude })
      toast.success(`Assigned ${includedFaces.length} face${includedFaces.length !== 1 ? 's' : ''} to ${personName}`)
      onAssigned && onAssigned(clusterId, personId, personName, includedFaces.length)
      onClose()
    } catch (e) {
      toast.error(`Assign failed: ${e.message}`)
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/15 bg-zinc-900 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-white/90">
              Cluster {clusterId} · {faces.length.toLocaleString()} face{faces.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-white/40">
              Click any face to exclude · {includedFaces.length} will be assigned · {excludedFaces.length} excluded
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-white/10 px-4 py-3">
          {personId ? (
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-white/80">
                Assigning to <span className="font-medium text-white">{personName}</span>
              </div>
              <button
                onClick={() => { setPersonId(null); setPersonName(null) }}
                className="text-xs text-white/40 hover:text-white/70"
              >
                change
              </button>
            </div>
          ) : (
            <Select
              options={people}
              onQueryChange={handleSearch}
              onChange={(opt) => { if (opt) { setPersonId(opt.value); setPersonName(opt.fullName || opt.text) } }}
              placeholder="Pick the person these faces belong to…"
              autoFocus
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="text-center text-sm text-white/50">Loading cluster…</div>}
          {!loading && faces.length === 0 && (
            <div className="text-center text-sm text-white/50">No faces remain in this cluster.</div>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
            {faces.map(f => {
              const key = `${f.photo_path}|${f.face_index}`
              const isExcluded = excluded.has(key)
              return (
                <div key={key} className="relative group">
                  <button
                    type="button"
                    onClick={() => toggleFace(f)}
                    title={`${f.photo_path} face=${f.face_index} — click to ${isExcluded ? 'include' : 'exclude'}`}
                    className={`block w-full overflow-hidden rounded ring-1 transition ${
                      isExcluded ? 'opacity-40 ring-red-500/60 grayscale' : 'ring-white/10 hover:ring-emerald-400/60'
                    }`}
                  >
                    {f.crop_url ? (
                      <img
                        src={f.crop_url}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full bg-white/5 object-cover"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="aspect-square w-full bg-white/5" />
                    )}
                    {isExcluded && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <X className="h-6 w-6 text-red-300" />
                      </span>
                    )}
                  </button>
                  {f.photo_path && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); openPhoto && openPhoto(f.photo_path) }}
                      title="open original photo"
                      className="absolute top-1 left-1 rounded bg-black/70 p-0.5 text-white/80 opacity-0 transition-opacity hover:bg-black hover:text-white group-hover:opacity-100"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
          <div className="text-xs text-white/40">
            {personId
              ? <>Will write {includedFaces.length} APPEARS_IN edge{includedFaces.length !== 1 ? 's' : ''} for {personName}</>
              : <>Pick a person to enable assign</>}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} disabled={busy} className="bg-white/5 text-white/70 hover:bg-white/10">
              Cancel
            </Button>
            <Button
              onClick={assign}
              disabled={busy || !personId || includedFaces.length === 0}
              className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Assign {includedFaces.length} face{includedFaces.length !== 1 ? 's' : ''}
              {excludedFaces.length > 0 && (
                <span className="ml-2 text-xs text-white/40">({excludedFaces.length} excluded)</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const THRESHOLD_KEY = 'ourkin:face-suggestions:threshold'
const MIN_CLUSTER_SIZE_KEY = 'ourkin:face-suggestions:min-cluster-size'

// Render sections incrementally — each card mounts crop <img>s, so dumping
// 100 groups at once janks the page. Start small, reveal more on click.
const SECTION_PAGE = 5
const SECTION_STEP = 10

function LoadMoreBar({ shown, total, onMore, noun = 'more' }) {
  if (total <= shown) return null
  return (
    <button
      type="button"
      onClick={onMore}
      className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white/90"
    >
      Load more — {(total - shown).toLocaleString()} {noun} hidden
    </button>
  )
}

export function FaceSuggestionsPage() {
  const { toast } = useToast()
  const [threshold, setThreshold] = useState(() => {
    const saved = parseFloat(localStorage.getItem(THRESHOLD_KEY))
    return Number.isFinite(saved) ? saved : DEFAULT_THRESHOLD
  })
  // Smallest cluster the brain will score. 1 surfaces stranded singleton
  // faces (e.g. a lone "me" shot that never clustered); 3 is the calmer
  // default that ignores noise-sized clusters.
  const [minClusterSize, setMinClusterSize] = useState(() => {
    const saved = parseInt(localStorage.getItem(MIN_CLUSTER_SIZE_KEY), 10)
    return Number.isFinite(saved) && saved >= 1 ? saved : 3
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState(null)   // total unassigned faces left
  const [dismissed, setDismissed] = useState(new Set())   // person_ids hidden client-side
  const [dismissedCandidates, setDismissedCandidates] = useState(new Set())
  const [leftover, setLeftover] = useState({ items: [], total: 0, loading: false })
  const [dismissedLeftover, setDismissedLeftover] = useState(new Set())
  const [inspect, setInspect] = useState(null)   // { clusterId, prefilledPersonId?, prefilledPersonName? }
  const [lightbox, setLightbox] = useState(null) // { path, is_video }
  // How many cards to render per section (incremental reveal).
  const [groupsShown, setGroupsShown] = useState(SECTION_PAGE)
  const [ambigShown, setAmbigShown] = useState(SECTION_PAGE)
  const [candShown, setCandShown] = useState(SECTION_PAGE)

  const openPhoto = useCallback((photoPath) => {
    if (!photoPath) return
    const video = isVideo(photoPath)
    setLightbox({
      path: photoPath,
      is_video: video,
      // MediaLightbox uses `url` for videos, `path` for images via mediumUrl().
      url: video ? mediaUrl(photoPath) : undefined,
    })
  }, [])

  const refreshRemaining = useCallback(() => {
    fetch('/api/faces/unassigned/count')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setRemaining(d.remaining) })
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setGroupsShown(SECTION_PAGE)
    setAmbigShown(SECTION_PAGE)
    setCandShown(SECTION_PAGE)
    refreshRemaining()
    try {
      const result = await getGroupedSuggestions({ threshold, margin: DEFAULT_MARGIN, limit: DEFAULT_LIMIT, minClusterSize })
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
    // Kick off leftover load too — paginated so refresh resets to page 1
    setLeftover({ items: [], total: 0, loading: true })
    try {
      const lf = await getLeftoverClusters({ threshold, offset: 0, limit: 50 })
      setLeftover({ items: lf.leftover, total: lf.total, loading: false })
    } catch (e) {
      setLeftover({ items: [], total: 0, loading: false })
    }
  }, [threshold, minClusterSize])

  const loadMoreLeftover = useCallback(async () => {
    setLeftover(prev => ({ ...prev, loading: true }))
    try {
      const lf = await getLeftoverClusters({ threshold, offset: leftover.items.length, limit: 50 })
      setLeftover(prev => ({
        items: [...prev.items, ...lf.leftover],
        total: lf.total,
        loading: false,
      }))
    } catch {
      setLeftover(prev => ({ ...prev, loading: false }))
    }
  }, [threshold, leftover.items.length])

  useEffect(() => { load() }, [load])

  const handleConfirm = async (group, clusters) => {
    setBusy(true)
    // One bulk call → one Neo4j sync + one brain rebuild for the whole group.
    // (Per-cluster assigns stampeded the transaction-memory pool on big groups.)
    try {
      const res = await assignClustersBulk(clusters.map(c => c.cluster_id), group.person_id)
      const assigned = res.assigned ?? clusters.reduce((s, c) => s + c.n_faces, 0)
      toast.success(`Confirmed ${assigned} face${assigned !== 1 ? 's' : ''} as ${group.person_name}`)
    } catch (e) {
      toast.error(`Failed to assign — ${e.message}`)
    } finally {
      setBusy(false)
    }
    setDismissed(prev => new Set(prev).add(group.person_id))
    refreshRemaining()  // cheap count refresh; full re-score only on explicit Refresh (it's a ~25s pass)
  }

  const handleDismiss = (group) => {
    setDismissed(prev => new Set(prev).add(group.person_id))
  }

  const handlePickCandidate = async (entry, candidate) => {
    setBusy(true)
    try {
      await assignCluster(entry.cluster_id, candidate.person_id)
      toast.success(`Assigned cluster ${entry.cluster_id} (${entry.n_faces} faces) to ${candidate.person_name}`)
      // Reject the other candidates for these faces so they're not suggested again
      const otherCandidates = entry.candidates.filter(c => c.person_id !== candidate.person_id)
      const faceList = (entry.samples || []).map(() => null).filter(Boolean)   // we don't have face refs in samples — skip negatives for now
      setData(prev => prev && ({ ...prev, ambiguous: prev.ambiguous.filter(a => a.cluster_id !== entry.cluster_id) }))
    } catch (e) {
      toast.error(`Assign failed: ${e.message}`)
    }
    setBusy(false)
    refreshRemaining()  // cheap count refresh; full re-score only on explicit Refresh (it's a ~25s pass)
  }

  const handleCreatePerson = async (candidate, fullName) => {
    setBusy(true)
    try {
      const person = await createPerson({ name: fullName })
      let assigned = 0
      let failed = 0
      for (const cluster of candidate.clusters) {
        try {
          await assignCluster(cluster.cluster_id, person.id)
          assigned += cluster.n_faces
        } catch {
          failed++
        }
      }
      if (assigned) toast.success(`Created ${fullName} and assigned ${assigned} face${assigned !== 1 ? 's' : ''}`)
      if (failed) toast.error(`${failed} cluster${failed !== 1 ? 's' : ''} failed`)
      setDismissedCandidates(prev => new Set(prev).add(candidate.candidate_id))
      refreshRemaining()  // cheap count refresh; full re-score only on explicit Refresh (it's a ~25s pass)
    } catch (e) {
      toast.error(`Create person failed: ${e.message}`)
    }
    setBusy(false)
  }

  const handleAssignExistingToCandidate = async (candidate, personId, personName) => {
    setBusy(true)
    let assigned = 0
    let failed = 0
    for (const cluster of candidate.clusters) {
      try {
        await assignCluster(cluster.cluster_id, personId)
        assigned += cluster.n_faces
      } catch {
        failed++
      }
    }
    if (assigned) toast.success(`Assigned ${assigned} face${assigned !== 1 ? 's' : ''} to ${personName}`)
    if (failed) toast.error(`${failed} cluster${failed !== 1 ? 's' : ''} failed`)
    setDismissedCandidates(prev => new Set(prev).add(candidate.candidate_id))
    refreshRemaining()  // cheap count refresh; full re-score only on explicit Refresh (it's a ~25s pass)
    setBusy(false)
  }

  const handleDismissCandidate = (candidate) => {
    setDismissedCandidates(prev => new Set(prev).add(candidate.candidate_id))
  }

  const handleSamePersonUnknown = async (candidate) => {
    // Auto-generate a placeholder name. User renames in /manage/people when they find out who it is.
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const placeholderName = `Unknown person ${stamp}`
    await handleCreatePerson(candidate, placeholderName)
  }

  const handleLeftoverAssign = async (cluster, personId, personName) => {
    setBusy(true)
    try {
      await assignCluster(cluster.cluster_id, personId)
      toast.success(`Assigned cluster ${cluster.cluster_id} (${cluster.n_faces} faces) to ${personName}`)
      setDismissedLeftover(prev => new Set(prev).add(cluster.cluster_id))
    } catch (e) {
      toast.error(`Assign failed: ${e.message}`)
    }
    setBusy(false)
  }

  const handleLeftoverCreate = async (cluster, fullName) => {
    setBusy(true)
    try {
      const person = await createPerson({ name: fullName })
      await assignCluster(cluster.cluster_id, person.id)
      toast.success(`Created ${fullName} and assigned ${cluster.n_faces} face${cluster.n_faces !== 1 ? 's' : ''}`)
      setDismissedLeftover(prev => new Set(prev).add(cluster.cluster_id))
    } catch (e) {
      toast.error(`Create failed: ${e.message}`)
    }
    setBusy(false)
  }

  const handleLeftoverSamePerson = async (cluster) => {
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
    await handleLeftoverCreate(cluster, `Unknown person ${stamp}`)
  }

  const handleLeftoverSkipForever = async (cluster) => {
    setBusy(true)
    try {
      await skipCluster(cluster.cluster_id)
      toast.info(`Skipped cluster ${cluster.cluster_id} forever (${cluster.n_faces} faces)`)
      setDismissedLeftover(prev => new Set(prev).add(cluster.cluster_id))
    } catch (e) {
      toast.error(`Skip failed: ${e.message}`)
    }
    setBusy(false)
  }

  const handleSkipForever = async (candidate) => {
    setBusy(true)
    let skipped = 0
    let failed = 0
    for (const cluster of candidate.clusters) {
      try {
        await skipCluster(cluster.cluster_id)
        skipped++
      } catch {
        failed++
      }
    }
    if (skipped) toast.info(`Skipped ${skipped} cluster${skipped !== 1 ? 's' : ''} forever (${candidate.n_faces} faces)`)
    if (failed) toast.error(`${failed} cluster${failed !== 1 ? 's' : ''} failed to skip`)
    setDismissedCandidates(prev => new Set(prev).add(candidate.candidate_id))
    refreshRemaining()  // cheap count refresh; full re-score only on explicit Refresh (it's a ~25s pass)
    setBusy(false)
  }

  const visibleGroups = (data?.groups || []).filter(g => !dismissed.has(g.person_id))
  const visibleCandidates = (data?.unknown_candidates || []).filter(c => !dismissedCandidates.has(c.candidate_id))
  const visibleLeftover = leftover.items.filter(c => !dismissedLeftover.has(c.cluster_id))

  const handleInspectAssigned = (clusterId, personId, personName, count) => {
    // Cluster has been written to Neo4j. Hide it from any visible section.
    setDismissedLeftover(prev => new Set(prev).add(clusterId))
    // Brain rebuilds in background — refresh shortly to surface newly-promoted matches.
    refreshRemaining()  // cheap count refresh; full re-score only on explicit Refresh (it's a ~25s pass)
  }

  return (
    <OpenPhotoContext.Provider value={openPhoto}>
    <div className="py-6">
      <Container>
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Face suggestions</h1>
            <p className="mt-1 text-sm text-white/50">
              Your brain. Likely matches surfaced from confirmed faces. One click confirms a whole group.
            </p>
            {remaining !== null && (
              <p className="mt-1 text-sm font-medium text-amber-300/90">
                {remaining.toLocaleString()} faces still unassigned
              </p>
            )}
          </div>
          <Button onClick={load} disabled={loading} className="bg-white/5 text-white/70 hover:bg-white/10">
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="mb-6 flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
          <label className="text-white/60">Threshold</label>
          <input
            type="range"
            min={0.50}
            max={0.95}
            step={0.01}
            value={threshold}
            onChange={e => {
              const v = parseFloat(e.target.value)
              setThreshold(v)
              localStorage.setItem(THRESHOLD_KEY, String(v))
            }}
            className="flex-1 accent-emerald-500"
          />
          <div className="w-12 text-right tabular-nums text-white/80">{threshold.toFixed(2)}</div>
          <div className="text-xs text-white/40">
            lower = more (noisier) · higher = fewer (safer)
          </div>
          <div className="ml-2 flex items-center gap-2 border-l border-white/10 pl-4">
            <label className="text-white/60">Min cluster size</label>
            <input
              type="number"
              min={1}
              step={1}
              value={minClusterSize}
              onChange={e => {
                const v = Math.max(1, parseInt(e.target.value, 10) || 1)
                setMinClusterSize(v)
                localStorage.setItem(MIN_CLUSTER_SIZE_KEY, String(v))
              }}
              className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-right tabular-nums text-white/80"
            />
            <div className="text-xs text-white/40">
              1 = include lone faces
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/35 bg-red-500/15 p-3 text-red-300">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-white/50">
            Scoring clusters against brain…
          </div>
        )}

        {data && (
          <>
            <section className="mb-6">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wide text-white/40">
                  Likely matches ({visibleGroups.length})
                </h2>
                <div className="text-xs text-white/40">
                  {visibleGroups.reduce((sum, g) => sum + g.n_faces, 0).toLocaleString()} faces queued
                </div>
              </div>
              {visibleGroups.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-white/50">
                  No high-confidence groups at this threshold. Lower it to see more.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleGroups.slice(0, groupsShown).map(g => (
                    <GroupCard
                      key={g.person_id}
                      group={g}
                      busy={busy}
                      onConfirm={(clusters) => handleConfirm(g, clusters)}
                      onDismiss={() => handleDismiss(g)}
                      onInspect={(clusterId, personId, personName) => setInspect({ clusterId, prefilledPersonId: personId, prefilledPersonName: personName })}
                    />
                  ))}
                </div>
              )}
              <LoadMoreBar shown={groupsShown} total={visibleGroups.length} noun="groups" onMore={() => setGroupsShown(n => n + SECTION_STEP)} />
            </section>

            {data.ambiguous?.length > 0 && (
              <section className="mb-6">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-white/40">
                    Ambiguous ({data.ambiguous.length})
                  </h2>
                  <div className="text-xs text-white/40">close-call clusters · pick the right person</div>
                </div>
                <div className="space-y-2">
                  {data.ambiguous.slice(0, ambigShown).map(a => (
                    <AmbiguousCard
                      key={a.cluster_id}
                      entry={a}
                      busy={busy}
                      onPick={handlePickCandidate}
                    />
                  ))}
                </div>
                <LoadMoreBar shown={ambigShown} total={data.ambiguous.length} noun="clusters" onMore={() => setAmbigShown(n => n + SECTION_STEP)} />
              </section>
            )}

            {visibleCandidates.length > 0 && (
              <section className="mb-6">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-amber-300/70">
                    Unknown person candidates ({visibleCandidates.length})
                  </h2>
                  <div className="text-xs text-white/40">
                    clusters that match each other but no one we know · {visibleCandidates.reduce((s, c) => s + c.n_faces, 0).toLocaleString()} faces
                  </div>
                </div>
                <div className="space-y-3">
                  {visibleCandidates.slice(0, candShown).map(c => (
                    <UnknownCandidateCard
                      key={c.candidate_id}
                      candidate={c}
                      busy={busy}
                      onCreate={handleCreatePerson}
                      onAssignExisting={handleAssignExistingToCandidate}
                      onDismiss={() => handleDismissCandidate(c)}
                      onSkipForever={() => handleSkipForever(c)}
                      onSamePersonUnknown={() => handleSamePersonUnknown(c)}
                      onInspect={(clusterId) => setInspect({ clusterId })}
                    />
                  ))}
                </div>
                <LoadMoreBar shown={candShown} total={visibleCandidates.length} noun="candidates" onMore={() => setCandShown(n => n + SECTION_STEP)} />
              </section>
            )}

            <section className="mb-6">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wide text-white/40">
                  Unmatched clusters ({leftover.total.toLocaleString()})
                </h2>
                <div className="text-xs text-white/40">
                  brain has no confident guess · pick manually or skip
                </div>
              </div>
              {visibleLeftover.length === 0 && !leftover.loading ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-white/50">
                  No leftover clusters. Brain found a home for everything.
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleLeftover.map(c => (
                    <LeftoverClusterRow
                      key={c.cluster_id}
                      cluster={c}
                      busy={busy}
                      onAssign={handleLeftoverAssign}
                      onCreate={handleLeftoverCreate}
                      onSamePersonUnknown={() => handleLeftoverSamePerson(c)}
                      onSkipForever={() => handleLeftoverSkipForever(c)}
                      onInspect={() => setInspect({
                        clusterId: c.cluster_id,
                        prefilledPersonId:   c.best_candidate?.person_id || null,
                        prefilledPersonName: c.best_candidate?.person_name || null,
                      })}
                    />
                  ))}
                  {leftover.items.length < leftover.total && (
                    <div className="pt-2 text-center">
                      <Button
                        onClick={loadMoreLeftover}
                        disabled={leftover.loading}
                        className="bg-white/5 text-white/70 hover:bg-white/10"
                      >
                        {leftover.loading
                          ? 'Loading…'
                          : `Load more (${(leftover.total - leftover.items.length).toLocaleString()} remaining)`}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </Container>

      {inspect && (
        <ClusterDetailModal
          clusterId={inspect.clusterId}
          prefilledPersonId={inspect.prefilledPersonId}
          prefilledPersonName={inspect.prefilledPersonName}
          onClose={() => setInspect(null)}
          onAssigned={handleInspectAssigned}
        />
      )}

      {lightbox && (
        <MediaLightbox
          items={[lightbox]}
          initialIndex={0}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
    </OpenPhotoContext.Provider>
  )
}
