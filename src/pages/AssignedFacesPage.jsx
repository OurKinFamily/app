import { useState, useEffect, useCallback, useRef } from 'react'
import { getClusters, getCluster } from '../lib/api'
import { isVideo, mediaUrl } from '../lib/media'
import { EntityChip } from '../components/EntityChip'
import { MediaLightbox } from '../components/MediaLightbox'
import { MediaDetail } from '../components/MediaDetail'
import { SubheaderPortal } from '../components/SubheaderPortal'
import { HeaderTrailingPortal } from '../components/HeaderTrailingPortal'
import { Tag } from '../components/Tag'

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
        {cluster.samples[0] && (
          <img
            src={cluster.samples[0]}
            alt=""
            loading="lazy"
            className="h-12 w-12 rounded bg-white/5 object-cover"
            onError={e => { e.target.style.display = 'none' }}
          />
        )}
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
        Select a person to view
      </div>
    )
  }

  const personName = cluster.person_name || cluster.person_id

  return (
    <div className="hide-scrollbar flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto">
      <div className="flex items-center gap-3">
        {cluster.person_id && (
          <EntityChip
            to={`/manage/people/${cluster.person_id}`}
            avatar={cluster.person_avatar ? mediaUrl(cluster.person_avatar) : null}
            initials
            text={personName}
            caption={cluster.person_known_as && cluster.person_known_as !== personName ? `(${cluster.person_known_as})` : null}
          />
        )}
        <Tag tone="slate">{cluster.size.toLocaleString()} face{cluster.size !== 1 ? 's' : ''}</Tag>
      </div>

      <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(64px,1fr))]">
        {detail
          ? detail.faces.map((f, i) => (
              <button
                key={i}
                onClick={() => f.photo_path && onOpenPhoto(detail.faces, i)}
                className="aspect-square overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
            ))
          : cluster.samples.map((url, i) => (
              <img key={i} src={url} alt="" loading="lazy" className="aspect-square w-full rounded bg-white/5 object-cover" />
            ))
        }
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
        <h1 className="text-sm font-medium text-white/80">Assigned Faces</h1>
      </SubheaderPortal>
      <HeaderTrailingPortal>
        {!loading && <Tag tone="green">{total.toLocaleString()} assigned</Tag>}
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
        <aside className="flex w-20 shrink-0 flex-col border-r border-white/5">
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
        </aside>

        <main className="flex flex-1 overflow-hidden p-3 md:p-6">
          <DetailPanel cluster={selected} onOpenPhoto={handleOpenPhoto} />
        </main>
      </div>
    </>
  )
}
