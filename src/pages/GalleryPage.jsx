import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, Outlet, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { useGallery } from '../lib/useGallery'
import { useFavorites } from '../lib/useFavorites'
import { useSelection } from '../lib/useSelection'
import { MediaGallery } from '../components/MediaGallery'
import { GalleryBulkBar } from '../components/GalleryBulkBar'
import { HeaderTrailingPortal } from '../components/HeaderTrailingPortal'
import { Drawer } from '../components/Drawer'
import { Dot } from '../components/Dot'
import { GalleryFiltersBody, FiltersIconButton } from './GalleryFilters'

const ROW_MIN = 50
const ROW_MAX = 2400
const ROW_DEFAULT = 200
const STORAGE_KEY = 'gallery-row-height'

export function GalleryPage() {
  const { year: yearParam } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const lightboxOpen = location.pathname.includes('/photo/')
  // yearFilter is anchor state — set on click only. URL is initial seed.
  // Subsequent URL changes (from scroll-sync below) don't refetch.
  const [yearFilter, setYearFilterState] = useState(() =>
    yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null
  )
  const [years, setYears] = useState([])
  // Filter state is mirrored into the URL query (?confidence=, ?undated=) so
  // any view is deep-linkable. Seed initial state from those params.
  const [searchParams, setSearchParams] = useSearchParams()
  const CONF_KEYS = ['high', 'medium', 'low', 'all']
  // Date-confidence floor for the gallery ('high' = default app behavior).
  // `undated` flips to the no-date ("0000") bucket — scanned albums etc.
  const [confidence, setConfidence] = useState(() => {
    const c = searchParams.get('confidence')
    return CONF_KEYS.includes(c) ? c : 'high'
  })
  const [undated, setUndated] = useState(() => searchParams.get('undated') === 'true')
  // GPS presence ('both' | 'has' | 'none'), camera model, unassigned-faces —
  // all deep-linkable and combinable with the date filters.
  const [gps, setGps] = useState(() => {
    const g = searchParams.get('gps')
    return ['has', 'none'].includes(g) ? g : 'both'
  })
  const [cameraModel, setCameraModel] = useState(() => searchParams.get('camera_model') || '')
  const [unassignedFaces, setUnassignedFaces] = useState(() => searchParams.get('unassigned_faces') === 'true')

  // Keep the URL query in sync with the filter state. Defaults are omitted to
  // keep links clean; undated drops `confidence` since the date-confidence
  // floor doesn't apply in the no-date bucket.
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    const set = (k, v, on) => (on ? next.set(k, v) : next.delete(k))
    set('undated', 'true', undated)
    set('confidence', confidence, !undated && confidence !== 'high')
    set('gps', gps, gps !== 'both')
    set('camera_model', cameraModel, !!cameraModel)
    set('unassigned_faces', 'true', unassignedFaces)
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [confidence, undated, gps, cameraModel, unassignedFaces]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bumped after a bulk edit to force useGallery to refetch (so just-edited
  // items re-evaluate against any active filter). `_r` is ignored by the API.
  const [refreshNonce, setRefreshNonce] = useState(0)
  const selection = useSelection()

  // Compose the gallery query params. The date axis is either the confidence
  // floor or the undated bucket; GPS / camera / unassigned-faces stack on top.
  const galleryParams = { ...(undated ? { undated: true } : { min_confidence: confidence }) }
  if (gps !== 'both') galleryParams.gps = gps
  if (cameraModel) galleryParams.camera_model = cameraModel
  if (unassignedFaces) galleryParams.unassigned_faces = true
  if (refreshNonce) galleryParams._r = refreshNonce

  const anyFilterActive =
    undated || confidence !== 'high' || gps !== 'both' || !!cameraModel || unassignedFaces

  const { media, loading, hasMoreOlder, hasMoreNewer, loadOlder, loadNewer, fillGap, removeItem } = useGallery({
    anchor: (undated || yearFilter == null) ? null : { year: yearFilter },
    params: galleryParams,
  })
  const { favs, toggle: toggleFav } = useFavorites()


  const galleryRef = useRef(null)
  const topSentinelRef = useRef(null)
  const pinchStart = useRef(null)
  const rowHeightRef = useRef(ROW_DEFAULT)
  const prependedRef = useRef(false)
  const prevHeightRef = useRef(0)
  const autoPrependedFor = useRef(null)

  const [rowHeight, setRowHeight] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return stored >= ROW_MIN && stored <= ROW_MAX ? stored : ROW_DEFAULT
  })

  useEffect(() => {
    rowHeightRef.current = rowHeight
    localStorage.setItem(STORAGE_KEY, String(Math.round(rowHeight)))
  }, [rowHeight])

  // Years that exist in the catalog at the chosen confidence floor (refetched
  // when confidence changes — lower floors reveal more/older years).
  useEffect(() => {
    fetch(`/api/gallery/years?min_confidence=${confidence}`)
      .then(r => (r.ok ? r.json() : null)).then(d => d && setYears(d)).catch(() => {})
  }, [confidence])

  // Bottom-edge loader (+velocity skip) is owned by MediaGallery.
  // Here we only handle the upward direction when an anchor exposed older years.
  // Skip while the lightbox is open — body position:fixed pins scrollY ≈ 0 so
  // any scroll event would call loadNewer in a loop, shifting media[] under
  // the lightbox's frozen index.
  useEffect(() => {
    if (lightboxOpen) return
    const onScroll = () => {
      if (hasMoreNewer && window.scrollY < 600) {
        prependedRef.current = true
        prevHeightRef.current = document.documentElement.scrollHeight
        loadNewer()
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lightboxOpen, loadNewer, hasMoreNewer])

  // After clicking a year, auto-prepend one batch of newer items so the user
  // has scroll headroom above to load more newer years naturally.
  // Skip while the lightbox is open — prepending shifts media and would change
  // what the frozen lightbox index points at.
  useEffect(() => {
    if (lightboxOpen) return
    if (yearFilter == null) { autoPrependedFor.current = null; return }
    if (autoPrependedFor.current === yearFilter) return
    if (!hasMoreNewer || media.length === 0) return
    autoPrependedFor.current = yearFilter
    prependedRef.current = true
    prevHeightRef.current = document.documentElement.scrollHeight
    loadNewer()
  }, [lightboxOpen, yearFilter, media.length, hasMoreNewer, loadNewer])

  // Ensure the page is scrollable. Sparse-year filters (e.g. 1925 with 1 image)
  // would otherwise lock you on a non-scrollable page; keep paging in either
  // direction until content fills the viewport or no more data exists.
  // Skip while lightbox is open — body is position:fixed, scrollHeight is tiny
  // and this would loop, shifting items behind the frozen lightbox index.
  useEffect(() => {
    if (lightboxOpen) return
    if (media.length === 0) return
    const doc = document.documentElement
    if (doc.scrollHeight >= window.innerHeight * 1.5) return
    if (hasMoreNewer) {
      prependedRef.current = true
      prevHeightRef.current = doc.scrollHeight
      loadNewer()
    } else if (hasMoreOlder) {
      loadOlder()
    }
  }, [lightboxOpen, media, hasMoreNewer, hasMoreOlder, loadNewer, loadOlder])

  // Top sentinel observer: window scroll events stop firing at scrollY=0,
  // so we use IntersectionObserver to keep triggering loadNewer at the top.
  // Skip while lightbox is open — sentinel sits at viewport top under the
  // fixed-body lock and would fire loadNewer forever, shifting media[].
  useEffect(() => {
    if (lightboxOpen || !hasMoreNewer || !topSentinelRef.current) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        prependedRef.current = true
        prevHeightRef.current = document.documentElement.scrollHeight
        loadNewer()
      }
    }, { rootMargin: '300px' })
    obs.observe(topSentinelRef.current)
    return () => obs.disconnect()
  }, [lightboxOpen, hasMoreNewer, loadNewer])

  // Scroll-anchor: after prepending newer items, shift scrollY by the height delta.
  useLayoutEffect(() => {
    if (!prependedRef.current) return
    const doc = document.documentElement
    const delta = doc.scrollHeight - prevHeightRef.current
    if (delta > 0) window.scrollTo(0, window.scrollY + delta)
    prependedRef.current = false
  }, [media])

  // Pinch-to-resize.
  useEffect(() => {
    const el = galleryRef.current
    if (!el) return
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onStart = e => {
      if (e.touches.length === 2) pinchStart.current = { dist: dist(e.touches), height: rowHeightRef.current }
    }
    const onMove = e => {
      if (e.touches.length === 2 && pinchStart.current) {
        e.preventDefault()
        const ratio = dist(e.touches) / pinchStart.current.dist
        setRowHeight(Math.max(ROW_MIN, Math.min(ROW_MAX, pinchStart.current.height * ratio)))
      }
    }
    const onEnd = () => { pinchStart.current = null }
    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  // Current filter query (without the leading '?') — appended to year-jump and
  // lightbox navigations so the filters survive route changes + deep links.
  const filterQS = () => {
    const qs = searchParams.toString()
    return qs ? `?${qs}` : ''
  }

  const open = item => navigate(`photo/${item.path}${filterQS()}`)

  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div className="p-4">
      <HeaderTrailingPortal>
        <div className="flex items-center gap-2">
          <GalleryBulkBar
            selectedPaths={selection.selectedPaths}
            onClear={selection.clear}
            onDone={() => setRefreshNonce(n => n + 1)}
          />
          <Dot show={anyFilterActive} color="red">
            <FiltersIconButton onClick={() => setFiltersOpen(true)} />
          </Dot>
        </div>
      </HeaderTrailingPortal>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <GalleryFiltersBody
          confidence={confidence}
          onConfidenceChange={setConfidence}
          undated={undated}
          onUndatedChange={setUndated}
          gps={gps}
          onGpsChange={setGps}
          cameraModel={cameraModel}
          onCameraModelChange={setCameraModel}
          unassignedFaces={unassignedFaces}
          onUnassignedFacesChange={setUnassignedFaces}
        />
      </Drawer>

      <div ref={topSentinelRef} className="h-px" />

      <div ref={galleryRef} style={{ touchAction: 'pan-x pan-y' }}>
        <MediaGallery
          items={media}
          rowHeight={rowHeight}
          favorites={favs}
          onFavorite={toggleFav}
          onSelect={open}
          selectedPaths={selection.selected}
          selectionActive={selection.count > 0}
          onToggleSelect={(item, index, shiftKey) => selection.toggle(item, index, shiftKey, media)}
          onLoadOlder={loadOlder}
          onFillGap={fillGap}
          scrubber={{
            years,
            onJump: y => {
              if (y === yearFilter) return
              window.scrollTo(0, 0)
              setYearFilterState(y)
              navigate((y ? `/gallery/${y}` : '/gallery') + filterQS())
            },
          }}
        />
      </div>

      <div className="flex h-16 items-center justify-center">
        {loading && (
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/20" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>

      <Outlet context={{ media, hasMore: hasMoreOlder, loadMore: loadOlder, removeItem }} />
    </div>
  )
}

