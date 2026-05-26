import { useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  BookOpen, Image as ImageIcon, GraduationCap, HeartPulse, Newspaper,
  Notebook, Award, Mail, FileText, Film, Video,
  X, ChevronLeft, ChevronRight, Volume2, Square, Play,
} from 'lucide-react'
import { useEscToClose } from '../lib/hooks'
import { MediaCard } from '../components/new/MediaCard'
import { Field } from '../components/new/Field'
import { DetailSection } from '../components/new/DetailSection'
import { EntityChip } from '../components/new/EntityChip'
import { displayName } from '../lib/people'

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

export function PersonScrapbook() {
  const { person } = useOutletContext()
  const [collections, setCollections] = useState(null)
  const [items, setItems] = useState(null)
  const [open, setOpen] = useState(null)

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

  if (!collections || !items) return <p className="text-[13px] text-white/30">Loading…</p>
  if (!collections.length && !items.length)
    return <p className="text-[13px] text-white/25">Nothing in the scrapbook yet.</p>

  return (
    <div className="max-w-5xl">
      {collections.length > 0 && (
        <>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Collections · {collections.length}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map(c => (
              <MediaCard
                key={c.id}
                cover={c.cover_path ? `/api/media/${c.cover_path}` : null}
                coverBadge={`${c.item_count} ${c.is_series ? 'pages' : 'items'}`}
                icon={typeIcon(c.type)}
                text={c.name}
                subtitle={TYPE_LABELS[c.type] || c.type}
                description={c.description}
                onClick={() => setOpen({ kind: 'collection', collection: c })}
              />
            ))}
          </div>
        </>
      )}

      {items.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Appears in · {items.length}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(it => (
              <MediaCard
                key={it.path}
                cover={it.thumb_url}
                coverBadge={it.is_video ? 'video' : null}
                icon={it.is_video ? <Video size={14} /> : <ImageIcon size={14} />}
                text={it.context_subject || 'Untitled'}
                subtitle={[it.content_date, it.place_name].filter(Boolean).join(' · ')}
                description={it.collection_name}
                onClick={() => setOpen({ kind: 'item', item: it })}
              />
            ))}
          </div>
        </>
      )}

      {open?.kind === 'collection' && (
        <CollectionViewer collection={open.collection} onClose={() => setOpen(null)} />
      )}
      {open?.kind === 'item' && (
        <CollectionViewer
          collection={{ name: open.item.context_subject || open.item.collection_name || 'Item', type: 'home_movies', is_series: false }}
          presetItems={[open.item]}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

// ── Collection viewer ──────────────────────────────────────────────────────────

function CollectionViewer({ collection, presetItems, onClose }) {
  useEscToClose(onClose)
  const [items, setItems]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [playing, setPlaying]   = useState(false)
  const [detail, setDetail]     = useState(null)
  const audioRef                = useRef(null)

  useEffect(() => {
    if (presetItems) {
      setItems(presetItems)
      if (presetItems.length) setSelected(0)
      return
    }
    fetch(`/api/collections/${collection.id}/items`)
      .then(r => r.json())
      .then(d => { setItems(d.items); if (d.items.length) setSelected(0) })
      .catch(() => setItems([]))
  }, [collection.id, presetItems])

  useEffect(() => {
    if (!items || selected === null) { setDetail(null); return }
    const path = items[selected]?.path
    if (!path) return
    setDetail(null)
    fetch(`/api/gallery/detail?path=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then(setDetail)
      .catch(() => setDetail(null))
  }, [items, selected])

  useEffect(() => {
    if (!items) return
    function onKey(e) {
      if (e.key === 'ArrowLeft')  setSelected(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setSelected(i => Math.min(items.length - 1, i + 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [items])

  // When page changes while playing, switch src and keep playing.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !items || selected === null) return
    const item = items[selected]
    if (playing && item?.audio_url) {
      audio.src = item.audio_url
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
      audio.src = ''
    }
  }, [selected])

  const isSeries = collection.is_series

  function prev() { setSelected(i => Math.max(0, i - 1)) }
  function next() { setSelected(i => Math.min(items.length - 1, i + 1)) }

  function toggleAudio() {
    const audio = audioRef.current
    const item  = items && selected !== null ? items[selected] : null
    if (!audio || !item?.audio_url) return
    if (playing) {
      audio.pause()
      audio.src = ''
      setPlaying(false)
    } else {
      audio.src = item.audio_url
      audio.play().catch(() => setPlaying(false))
      setPlaying(true)
    }
  }

  const current = items && selected !== null ? items[selected] : null

  return (
    <div className="fixed inset-0 z-[1300] flex flex-col bg-black/90" onClick={onClose}>
      <div
        className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-medium text-white/80">{collection.name}</span>
          <span className="flex items-center gap-1.5 text-[12px] text-white/30">
            {typeIcon(collection.type, 14)}
            {TYPE_LABELS[collection.type] || collection.type}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {!items && (
        <div className="flex flex-1 items-center justify-center text-[13px] text-white/30">Loading…</div>
      )}

      {items && items.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-[13px] text-white/30">No items found.</div>
      )}

      {items && items.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex min-h-0 flex-1">
            {/* Main view */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden p-4">
              {current && (
                <>
                  <div className="relative inline-block">
                    {current.is_video ? (
                      <video
                        key={current.path}
                        poster={current.thumb_url}
                        controls
                        autoPlay
                        className="block max-w-full rounded-lg object-contain shadow-2xl"
                        style={{ maxHeight: isSeries ? 'calc(100vh - 240px)' : 'calc(100vh - 192px)' }}
                      >
                        <source src={current.url} />
                        {current.subtitle_url && (
                          <track kind="subtitles" src={current.subtitle_url} srcLang="en" label="English" default />
                        )}
                      </video>
                    ) : (
                      <img
                        src={current.url}
                        alt=""
                        className="block max-w-full rounded-lg object-contain shadow-2xl"
                        style={{ maxHeight: isSeries ? 'calc(100vh - 240px)' : 'calc(100vh - 192px)' }}
                      />
                    )}
                    {current.audio_url && (
                      <button
                        onClick={toggleAudio}
                        title={current.audio_description || 'Play audio'}
                        className={
                          'absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all ' +
                          (playing ? 'bg-blue-500/80 text-white' : 'bg-black/60 text-white/70 hover:bg-black/80 hover:text-white')
                        }
                      >
                        {playing ? <Square size={16} /> : <Volume2 size={16} />}
                      </button>
                    )}
                  </div>
                  <audio ref={audioRef} onEnded={() => setPlaying(false)} />
                  {isSeries && (
                    <div className="mt-3 flex shrink-0 items-center gap-4">
                      <button
                        onClick={prev}
                        disabled={selected === 0}
                        className="flex items-center gap-1 rounded bg-white/10 px-3 py-1.5 text-[12px] text-white/60 transition-colors hover:bg-white/15 disabled:opacity-20"
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <span className="text-[12px] text-white/30">
                        {current.page_number != null ? `Page ${current.page_number}` : `${selected + 1} / ${items.length}`}
                      </span>
                      <button
                        onClick={next}
                        disabled={selected === items.length - 1}
                        className="flex items-center gap-1 rounded bg-white/10 px-3 py-1.5 text-[12px] text-white/60 transition-colors hover:bg-white/15 disabled:opacity-20"
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Metadata panel */}
            {current && (
              <div className="w-72 shrink-0 overflow-y-auto border-l border-white/8 bg-black/20 p-4">
                <DetailSection title="When & where">
                  <Field label="Date" value={current.content_date} />
                  {current.content_date_explanation && (
                    <p className="mt-0.5 text-[10px] italic text-white/30">{current.content_date_explanation}</p>
                  )}
                  <Field label="Place" value={current.place_name} />
                  <Field label="Subject" value={current.context_subject} />
                </DetailSection>

                {detail?.people?.length > 0 && (
                  <DetailSection title={`People · ${detail.people.length}`}>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.people.map(p => (
                        <EntityChip
                          key={p.id}
                          to={`/manage/people/${p.id}`}
                          avatar={p.crop_url || null}
                          initials
                          text={displayName(p)}
                        />
                      ))}
                    </div>
                  </DetailSection>
                )}

                {detail?.unidentified?.length > 0 && (
                  <DetailSection title={`Unidentified · ${detail.unidentified.length}`}>
                    <div className="flex flex-wrap gap-1">
                      {detail.unidentified.map(f => (
                        <img
                          key={f.face_index}
                          src={f.crop_url}
                          alt=""
                          title={`Face ${f.face_index}`}
                          className="h-9 w-9 rounded border border-white/10 object-cover"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  </DetailSection>
                )}

                {current.context_notes && (
                  <DetailSection title="Notes">
                    <p className="text-[12px] leading-relaxed text-white/50">{current.context_notes}</p>
                  </DetailSection>
                )}

                {current.description && (
                  <DetailSection title="Description">
                    <p className="text-[12px] leading-relaxed text-white/50">{current.description}</p>
                  </DetailSection>
                )}

                {current.transcription && (
                  <DetailSection title="Transcription">
                    <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-white/40">{current.transcription}</p>
                  </DetailSection>
                )}

                {(current.physical_status || current.physical_condition) && (
                  <DetailSection title="Physical original">
                    <Field label="Status" value={current.physical_status} />
                    <Field label="Condition" value={current.physical_condition} />
                  </DetailSection>
                )}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          <div className="flex h-24 shrink-0 gap-0.5 overflow-x-auto border-t border-white/8 bg-black/40">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={
                  'relative aspect-square h-full shrink-0 overflow-hidden transition-all ' +
                  (selected === i ? 'ring-2 ring-inset ring-blue-400' : 'opacity-50 hover:opacity-80')
                }
              >
                <img
                  src={item.is_video ? item.thumb_url : item.url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {item.is_video && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/80 drop-shadow">
                    <Play size={16} className="fill-white" />
                  </span>
                )}
                {isSeries && item.page_number != null && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[9px] text-white/60">
                    {item.page_number}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
