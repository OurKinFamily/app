import { useState, useEffect } from 'react'
import { useOutletContext, useParams, useNavigate } from 'react-router-dom'
import {
  BookOpen, Image as ImageIcon, GraduationCap, HeartPulse, Newspaper,
  Notebook, Award, Mail, FileText, Film, Video, ChevronLeft, Search,
  LayoutGrid, List,
} from 'lucide-react'
import { MediaCard, MediaRow } from '../components/MediaCard'
import { PhotoLightbox } from '../components/PhotoLightbox'
import { mediaUrl } from '../lib/media'

const VIEW_STORAGE_KEY = 'scrapbook-view-mode'

const TYPE_LABELS = {
  baby_book:      'Baby Book',
  photo_album:    'Photo Album',
  yearbook:       'Yearbook',
  medical_records:'Medical Records',
  newspaper:      'Newspaper',
  school_papers:  'School Papers',
  certificates:   'Certificates',
  letters:        'Letters',
  documents:      'Documents',
  home_movies:    'Home Movies',
}

const TYPE_ICONS = {
  baby_book:       BookOpen,
  photo_album:     ImageIcon,
  yearbook:        GraduationCap,
  medical_records: HeartPulse,
  newspaper:       Newspaper,
  school_papers:   Notebook,
  certificates:    Award,
  letters:         Mail,
  documents:       FileText,
  home_movies:     Film,
}

function typeIcon(type, size = 14) {
  const Icon = TYPE_ICONS[type] || FileText
  return <Icon size={size} />
}

// Heritage items use `thumb_url`; the shared lightbox reads `thumbnail_url`.
function adaptItem(it) {
  return { ...it, thumbnail_url: it.thumb_url }
}

export function PersonScrapbook() {
  const { person } = useOutletContext()
  const navigate = useNavigate()
  const { collectionId } = useParams()
  const [collections, setCollections] = useState(null)
  const [items, setItems] = useState(null)

  // Drill-down — driven by the URL. `:collectionId` present → drilled view;
  // absent → top-level scrapbook. openItems is fetched lazily on entry.
  const [openItems, setOpenItems] = useState(null)
  const [openLoading, setOpenLoading] = useState(false)
  const openColl = collectionId
    ? collections?.find(c => c.id === collectionId) || null
    : null
  const [filter, setFilter] = useState('')
  const [topFilter, setTopFilter] = useState('')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_STORAGE_KEY) || 'grid')
  useEffect(() => { localStorage.setItem(VIEW_STORAGE_KEY, viewMode) }, [viewMode])
  const ItemComp = viewMode === 'grid' ? MediaCard : MediaRow
  // auto-fill grids — column count grows automatically as the viewport widens
  // (no breakpoint steps needed). `minmax` sets the floor per card so they
  // don't collapse below readable width.
  const gridCls  = viewMode === 'grid'
    ? 'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]'
    : 'flex flex-col gap-2'
  const innerGridCls = viewMode === 'grid'
    ? 'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]'
    : 'flex flex-col gap-2'

  const [viewerItems, setViewerItems] = useState(null)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [viewerTitle, setViewerTitle] = useState('')

  useEffect(() => {
    fetch(`/api/people/${person.id}/collections`)
      .then(r => r.json())
      .then(setCollections)
      .catch(() => setCollections([]))
    fetch(`/api/people/${person.id}/items`)
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]))
  }, [person.id])

  // Drill into a collection — push the URL; the effect below fetches items.
  function enterCollection(collection) {
    navigate(`/manage/people/${person.id}/scrapbook/${collection.id}`)
  }

  function exitCollection() {
    navigate(`/manage/people/${person.id}/scrapbook`)
    setFilter('')
  }

  // When :collectionId changes (incl. on first mount via direct URL), fetch
  // the inner items. Clear on exit.
  useEffect(() => {
    if (!collectionId) { setOpenItems(null); return }
    let alive = true
    setOpenItems(null)
    setOpenLoading(true)
    fetch(`/api/collections/${collectionId}/items`)
      .then(r => r.json())
      .then(d => { if (alive) setOpenItems((d.items || []).map(adaptItem)) })
      .catch(() => { if (alive) setOpenItems([]) })
      .finally(() => { if (alive) setOpenLoading(false) })
    return () => { alive = false }
  }, [collectionId])

  // Client-side substring filter across the visible card fields. Cheap;
  // collections rarely exceed a few hundred items.
  function matchesFilter(it, q) {
    if (!q) return true
    const hay = [
      it.context_subject, it.content_date, it.place_name, it.description,
      it.transcription, it.collection_name, it.page_number != null ? `page ${it.page_number}` : '',
    ].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q.toLowerCase())
  }

  function matchesCollection(c, q) {
    if (!q) return true
    const hay = [c.name, c.description, c.type, TYPE_LABELS[c.type]]
      .filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q.toLowerCase())
  }

  function openItemInLightbox(item) {
    setViewerTitle(item.context_subject || item.collection_name || 'Item')
    setViewerItems([adaptItem(item)])
    setViewerIndex(0)
  }

  // Lightbox for a drilled-in collection: pass the whole items array so
  // left/right walks through siblings.
  function openCollectionItemInLightbox(index) {
    setViewerTitle(openColl.name)
    setViewerItems(openItems)
    setViewerIndex(index)
  }

  if (!collections || !items) return <p className="text-[13px] text-white/30">Loading…</p>
  if (!openColl && !collections.length && !items.length)
    return <p className="text-[13px] text-white/25">Nothing in the scrapbook yet.</p>

  // ── Drilled-in collection view ──────────────────────────────────────────────
  if (openColl) {
    return (
      <div className="max-w-5xl">
        <button
          onClick={exitCollection}
          aria-label="Back to scrapbook"
          className="mb-4 -ml-2 flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-white/50 group-hover:text-white">
            <ChevronLeft size={20} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium text-white/85">{openColl.name}</span>
            <span className="block text-[11px] text-white/40">
              {TYPE_LABELS[openColl.type] || openColl.type}
              {openItems ? ` · ${openItems.length} ${openColl.is_series ? 'pages' : 'items'}` : ''}
            </span>
          </span>
        </button>

        {openItems && openItems.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <label className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter…"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-9 pr-3 text-[13px] text-white placeholder-white/30 outline-none focus:border-white/25"
              />
            </label>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        )}

        {openLoading && <p className="text-[13px] text-white/30">Loading…</p>}

        {openItems && openItems.length === 0 && !openLoading && (
          <p className="text-[13px] text-white/25">Empty collection.</p>
        )}

        {openItems && openItems.length > 0 && (() => {
          const visible = openItems
            .map((it, i) => ({ it, i }))
            .filter(({ it }) => matchesFilter(it, filter))
          if (visible.length === 0) {
            return <p className="text-[13px] text-white/25">No items match &ldquo;{filter}&rdquo;.</p>
          }
          return (
            <div className={innerGridCls}>
              {visible.map(({ it, i }) => (
                <ItemComp
                  key={it.path}
                  cover={it.thumb_url || it.thumbnail_url}
                  coverBadge={it.is_video ? 'video' : (it.page_number != null ? `p. ${it.page_number}` : null)}
                  icon={it.is_video ? <Video size={14} /> : <ImageIcon size={14} />}
                  text={it.context_subject || (openColl.is_series && it.page_number != null ? `Page ${it.page_number}` : 'Untitled')}
                  subtitle={[it.content_date, it.place_name].filter(Boolean).join(' · ')}
                  onClick={() => openCollectionItemInLightbox(i)}
                />
              ))}
            </div>
          )
        })()}

        {viewerItems && (
          <PhotoLightbox
            items={viewerItems}
            initialIndex={viewerIndex}
            title={viewerTitle}
            onClose={() => setViewerItems(null)}
          />
        )}
      </div>
    )
  }

  // ── Top-level scrapbook ─────────────────────────────────────────────────────
  const visibleCollections = collections.filter(c => matchesCollection(c, topFilter))
  const visibleItems       = items.filter(it => matchesFilter(it, topFilter))
  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center gap-2">
        <label className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={topFilter}
            onChange={e => setTopFilter(e.target.value)}
            placeholder="Filter scrapbook…"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-9 pr-3 text-[13px] text-white placeholder-white/30 outline-none focus:border-white/25"
          />
        </label>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {visibleCollections.length > 0 && (
        <>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Collections · {visibleCollections.length}{topFilter && ` of ${collections.length}`}
          </h2>
          <div className={gridCls}>
            {visibleCollections.map(c => (
              <ItemComp
                key={c.id}
                cover={c.cover_path ? mediaUrl(c.cover_path) : null}
                coverBadge={`${c.item_count} ${c.is_series ? 'pages' : 'items'}`}
                icon={typeIcon(c.type)}
                text={c.name}
                subtitle={TYPE_LABELS[c.type] || c.type}
                description={c.description}
                onClick={() => enterCollection(c)}
              />
            ))}
          </div>
        </>
      )}

      {visibleItems.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Appears in · {visibleItems.length}{topFilter && ` of ${items.length}`}
          </h2>
          <div className={gridCls}>
            {visibleItems.map(it => (
              <ItemComp
                key={it.path}
                cover={it.thumb_url}
                coverBadge={it.is_video ? 'video' : null}
                icon={it.is_video ? <Video size={14} /> : <ImageIcon size={14} />}
                text={it.context_subject || 'Untitled'}
                subtitle={[it.content_date, it.place_name].filter(Boolean).join(' · ')}
                description={it.collection_name}
                onClick={() => openItemInLightbox(it)}
              />
            ))}
          </div>
        </>
      )}

      {topFilter && visibleCollections.length === 0 && visibleItems.length === 0 && (
        <p className="text-[13px] text-white/25">No collections or items match &ldquo;{topFilter}&rdquo;.</p>
      )}

      {viewerItems && (
        <PhotoLightbox
          items={viewerItems}
          initialIndex={viewerIndex}
          title={viewerTitle}
          onClose={() => setViewerItems(null)}
        />
      )}
    </div>
  )
}

// Grid / list toggle. Two icon buttons; whichever matches `value` is active.
function ViewToggle({ value, onChange }) {
  const btn = (mode, Icon, label) => {
    const active = value === mode
    return (
      <button
        type="button"
        onClick={() => onChange(mode)}
        aria-label={label}
        aria-pressed={active}
        className={
          'flex h-8 w-8 items-center justify-center transition-colors ' +
          (active ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/70')
        }
      >
        <Icon size={16} />
      </button>
    )
  }
  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg border border-white/10">
      {btn('grid', LayoutGrid, 'Grid view')}
      {btn('row',  List,       'List view')}
    </div>
  )
}

