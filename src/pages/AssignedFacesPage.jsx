import { useState, useEffect, useCallback, useRef } from 'react'
import { getClusters, getCluster } from '../lib/api'
import { isVideo, mediaUrl } from '../lib/media'
import { EntityChip } from '../components/EntityChip'
import { PhotoLightbox } from '../components/PhotoLightbox'

const PAGE_SIZE = 50

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
      </div>
      <div className="truncate text-[12px] font-medium text-white/80">
        {cluster.person_name || '(unknown)'}
        {cluster.person_known_as && <span className="ml-1 text-white/40">({cluster.person_known_as})</span>}
      </div>
      <div className="text-[11px] text-white/30">{cluster.size} face{cluster.size !== 1 ? 's' : ''}</div>
    </button>
  )
}

function DetailPanel({ cluster, onOpenPhoto }) {
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    setDetail(null)
    if (!cluster) return
    getCluster(cluster.id).then(setDetail).catch(() => {})
  }, [cluster?.id])

  if (!cluster) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-white/20">
        Select a cluster to view
      </div>
    )
  }

  const personName = cluster.person_name || cluster.person_id

  return (
    <div className="hide-scrollbar flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto pr-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-white">
            {personName}
            {cluster.person_known_as && <span className="ml-2 text-white/40">({cluster.person_known_as})</span>}
          </h2>
          <p className="mt-0.5 text-[12px] text-white/30">{cluster.size} faces</p>
        </div>
        {cluster.person_id && (
          <EntityChip
            to={`/manage/people/${cluster.person_id}`}
            avatar={cluster.person_avatar ? mediaUrl(cluster.person_avatar) : null}
            initials
            text={personName}
          />
        )}
      </div>

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {detail ? `${detail.faces.length} crops` : 'Samples'}
          {!detail && <span className="ml-1 opacity-50">(loading…)</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {detail
            ? detail.faces.map((f, i) => (
                <button
                  key={i}
                  onClick={() => f.photo_path && onOpenPhoto(detail.faces, i)}
                  className="overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  title="Open original photo"
                >
                  <img
                    src={f.crop_url}
                    alt=""
                    className="h-16 w-16 bg-white/5 object-cover transition-opacity hover:opacity-80"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </button>
              ))
            : cluster.samples.map((url, i) => (
                <img key={i} src={url} alt="" className="h-16 w-16 rounded bg-white/5 object-cover" />
              ))
          }
        </div>
      </div>
    </div>
  )
}

export function AssignedFacesPage() {
  const [clusters, setClusters]       = useState([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(false)
  const [selected, setSelected]       = useState(null)
  const [viewer, setViewer]           = useState(null)
  const offsetRef = useRef(0)
  const sentinelRef = useRef(null)

  const loadPage = useCallback(async (offset, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const data = await getClusters('assigned', PAGE_SIZE, offset)
      setClusters(prev => append ? [...prev, ...data.clusters] : data.clusters)
      setTotal(data.total)
      setHasMore(offset + PAGE_SIZE < data.total)
      offsetRef.current = offset + data.clusters.length
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
        <div className="flex w-56 shrink-0 flex-col border-r border-white/5">
          <div className="border-b border-white/5 px-4 pb-3 pt-6">
            <h1 className="text-sm font-semibold text-white">Assigned Clusters</h1>
            <p className="mt-0.5 text-[11px] text-white/30">
              {loading ? '…' : `${total} assigned`}
            </p>
          </div>
          <div className="hide-scrollbar flex-1 space-y-1.5 overflow-y-auto p-2">
            {loading && <p className="p-2 text-xs text-white/20">Loading…</p>}
            {!loading && clusters.length === 0 && (
              <p className="p-2 text-xs text-white/20">No assigned clusters yet.</p>
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

        <div className="flex flex-1 overflow-hidden p-6">
          <DetailPanel cluster={selected} onOpenPhoto={handleOpenPhoto} />
        </div>
      </div>
    </>
  )
}
