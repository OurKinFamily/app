import { useState, useEffect } from 'react'
import { useOutletContext, useParams, useNavigate } from 'react-router-dom'
import {
  BookOpen, Image as ImageIcon, GraduationCap, HeartPulse, Newspaper,
  Notebook, Award, Mail, FileText, Film, Video, ChevronLeft, Search,
  LayoutGrid, List, Lock, Unlock,
} from 'lucide-react'
import { MediaCard, MediaRow } from '../components/MediaCard'
import { PhotoLightbox } from '../components/PhotoLightbox'
import { mediaUrl } from '../lib/media'
import { useIsAdmin } from '../contexts/MeContext'
import { CollectionStory } from '../components/CollectionStory'

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

// A collection may hold sub-collections, loose items, or both. Label it by what
// it actually contains — a parent holding only children would otherwise read
// "0 items". `descendant_item_count` includes items nested further down.
export function collectionBadge(c) {
  const kids = c.child_count || 0
  const items = c.item_count || 0
  const deep = c.descendant_item_count ?? items
  const unit = c.is_series ? 'pages' : 'items'
  if (kids && items) return `${kids} in · ${items} ${unit}`
  if (kids) return `${kids} inside · ${deep} ${unit}`
  return `${items} ${unit}`
}

// Heritage items use `thumb_url`; the shared lightbox reads `thumbnail_url`.
function adaptItem(it) {
  return { ...it, thumbnail_url: it.thumb_url }
}

export function PersonScrapbook() {
  const { person } = useOutletContext()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const { collectionId } = useParams()
  const [collections, setCollections] = useState(null)
  const [items, setItems] = useState(null)

  // Owner-only: toggle a collection private (hidden from family viewers).
  async function toggleCollectionPrivate(c) {
    const next = !c.private
    try {
      const res = await fetch(`/api/collections/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ private: next }),
      })
      if (!res.ok) return
      setCollections(cols => cols.map(x => (x.id === c.id ? { ...x, private: next } : x)))
    } catch { /* leave state unchanged on failure */ }
  }

  // Persist the collection's long-form story. Returns true so the editor knows
  // whether to close.
  async function saveStory(story) {
    try {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story }),
      })
      if (!res.ok) return false
      setOpenDetail(d => (d ? { ...d, story } : d))
      return true
    } catch {
      return false
    }
  }

  // Drill-down — driven by the URL. `:collectionId` present → drilled view;
  // absent → top-level scrapbook. openItems is fetched lazily on entry.
  const [openItems, setOpenItems] = useState(null)
  const [openLoading, setOpenLoading] = useState(false)
  // Fetched per-collection, because a NESTED collection is deliberately absent
  // from the top-level list and so can't be found there. Falls back to the
  // local list for an instant first paint when drilling from the top.
  const [openDetail, setOpenDetail] = useState(null)
  // `Boolean(openDetail) &&` is load-bearing: at the top level BOTH openDetail
  // and collectionId are nullish, so an id comparison alone is
  // `undefined === undefined` — true — and every read below would hit null.
  const detailMatches = Boolean(openDetail) && openDetail.id === collectionId
  const openColl = collectionId
    ? (detailMatches
        ? openDetail
        : collections?.find(c => c.id === collectionId) || null)
    : null
  const openChildren = detailMatches ? (openDetail.children || []) : []
  const openAncestors = detailMatches ? (openDetail.ancestors || []) : []
  const openStory = detailMatches ? openDetail.story : null
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

  // Back goes UP one level, not all the way out — ancestors[0] is the nearest
  // parent. Only a top-level collection returns to the scrapbook root.
  function exitCollection() {
    const parent = openAncestors[0]
    navigate(parent
      ? `/manage/people/${person.id}/scrapbook/${parent.id}`
      : `/manage/people/${person.id}/scrapbook`)
    setFilter('')
  }

  // When :collectionId changes (incl. on first mount via direct URL), fetch
  // the inner items. Clear on exit.
  useEffect(() => {
    if (!collectionId) { setOpenItems(null); setOpenDetail(null); return }
    let alive = true
    setOpenItems(null)
    setOpenLoading(true)
    fetch(`/api/collections/${collectionId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d) setOpenDetail(d) })
      .catch(() => {})
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
        {/* Trail only appears once nested — ancestors come back nearest-first,
            so reverse for reading order. Lets you jump up more than one level. */}
        {openAncestors.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-[11px] text-white/40">
            <button
              onClick={() => navigate(`/manage/people/${person.id}/scrapbook`)}
              className="rounded px-1 py-0.5 transition-colors hover:bg-white/5 hover:text-white/70"
            >
              Scrapbook
            </button>
            {[...openAncestors].reverse().map(a => (
              <span key={a.id} className="flex items-center gap-1">
                <span aria-hidden="true">/</span>
                <button
                  onClick={() => navigate(`/manage/people/${person.id}/scrapbook/${a.id}`)}
                  className="rounded px-1 py-0.5 transition-colors hover:bg-white/5 hover:text-white/70"
                >
                  {a.name}
                </button>
              </span>
            ))}
          </nav>
        )}
        <button
          onClick={exitCollection}
          aria-label={openAncestors[0] ? `Back to ${openAncestors[0].name}` : 'Back to scrapbook'}
          className="mb-4 -ml-2 flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-white/50 group-hover:text-white">
            <ChevronLeft size={20} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium text-white/85">{openColl.name}</span>
            <span className="block text-[11px] text-white/40">
              {TYPE_LABELS[openColl.type] || openColl.type}
              {openChildren.length > 0
                ? ` · ${openChildren.length} ${openChildren.length === 1 ? 'collection' : 'collections'}`
                : ''}
              {openItems && openItems.length > 0
                ? ` · ${openItems.length} ${openColl.is_series ? 'pages' : 'items'}`
                : ''}
            </span>
          </span>
        </button>

        <CollectionStory
          story={openStory}
          canEdit={isAdmin}
          onSave={saveStory}
        />

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

        {openChildren.length > 0 && (
          <>
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Collections · {openChildren.length}
            </h2>
            <div className={`${gridCls} mb-8`}>
              {openChildren.map(c => (
                <div key={c.id} className={`relative ${c.private ? 'opacity-80' : ''}`}>
                  <ItemComp
                    cover={c.cover_path ? mediaUrl(c.cover_path) : null}
                    coverBadge={collectionBadge(c)}
                    icon={typeIcon(c.type)}
                    text={c.name}
                    subtitle={TYPE_LABELS[c.type] || c.type}
                    description={c.description}
                    onClick={() => enterCollection(c)}
                  />
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); toggleCollectionPrivate(c) }}
                      title={c.private
                        ? 'Private — only you can see this. Click to make it visible to family.'
                        : 'Visible to family. Click to make private (only you).'}
                      aria-label={c.private ? 'Make collection public' : 'Make collection private'}
                      className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 backdrop-blur transition hover:bg-black/80"
                    >
                      {c.private
                        ? <Lock size={14} className="text-amber-400" />
                        : <Unlock size={14} className="text-white/60" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {openItems && openItems.length === 0 && !openLoading && openChildren.length === 0 && (
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
              <div key={c.id} className={`relative ${c.private ? 'opacity-80' : ''}`}>
                <ItemComp
                  cover={c.cover_path ? mediaUrl(c.cover_path) : null}
                  coverBadge={collectionBadge(c)}
                  icon={typeIcon(c.type)}
                  text={c.name}
                  subtitle={TYPE_LABELS[c.type] || c.type}
                  description={c.description}
                  onClick={() => enterCollection(c)}
                />
                {isAdmin && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleCollectionPrivate(c) }}
                    title={c.private
                      ? 'Private — only you can see this. Click to make it visible to family.'
                      : 'Visible to family. Click to make private (only you).'}
                    aria-label={c.private ? 'Make collection public' : 'Make collection private'}
                    className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 backdrop-blur transition hover:bg-black/80"
                  >
                    {c.private
                      ? <Lock size={14} className="text-amber-400" />
                      : <Unlock size={14} className="text-white/60" />}
                  </button>
                )}
              </div>
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

