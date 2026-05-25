import { useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useEscToClose } from '../lib/hooks'

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
  baby_book:      '📖',
  photo_album:    '🖼',
  yearbook:       '🎓',
  medical_records:'🏥',
  newspaper:      '📰',
  school_papers:  '✏️',
  certificates:   '🏅',
  letters:        '✉️',
  documents:      '📄',
  home_movies:    '🎬',
}

export function PersonScrapbook() {
  const { person } = useOutletContext()
  const [collections, setCollections] = useState(null)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    fetch(`/api/people/${person.id}/collections`)
      .then(r => r.json())
      .then(setCollections)
      .catch(() => setCollections([]))
  }, [person.id])

  if (!collections) return <div className="text-white/30 text-sm">Loading…</div>
  if (!collections.length) return <div className="text-white/30 text-sm">No collections yet.</div>

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-white/40 uppercase tracking-wider text-xs mb-6">Scrapbook</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map(c => (
          <CollectionCard key={c.id} collection={c} onClick={() => setOpen(c)} />
        ))}
      </div>
      {open && <CollectionViewer collection={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

// ── Collection card ────────────────────────────────────────────────────────────

function CollectionCard({ collection: c, onClick }) {
  const label = TYPE_LABELS[c.type] || c.type
  const icon  = TYPE_ICONS[c.type] || '📄'

  return (
    <button onClick={onClick}
      className="group text-left bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 rounded-xl overflow-hidden transition-all">
      <div className="aspect-[4/3] bg-white/5 overflow-hidden relative">
        {c.cover_path
          ? <img src={`/api/media/${c.cover_path}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">{icon}</div>}
        {c.is_series && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white/70 text-[10px] px-1.5 py-0.5 rounded">
            {c.item_count} pages
          </div>
        )}
        {!c.is_series && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white/70 text-[10px] px-1.5 py-0.5 rounded">
            {c.item_count} items
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-white/80 text-[13px] font-medium leading-tight">{c.name}</p>
        <p className="text-white/35 text-[11px] mt-0.5">{icon} {label}</p>
        {c.description && <p className="text-white/25 text-[11px] mt-1 line-clamp-2">{c.description}</p>}
      </div>
    </button>
  )
}

// ── Collection viewer ──────────────────────────────────────────────────────────

function CollectionViewer({ collection, onClose }) {
  useEscToClose(onClose)
  const [items, setItems]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [playing, setPlaying]   = useState(false)
  const [detail, setDetail]     = useState(null)
  const audioRef                = useRef(null)

  useEffect(() => {
    fetch(`/api/collections/${collection.id}/items`)
      .then(r => r.json())
      .then(d => { setItems(d.items); if (d.items.length) setSelected(0) })
      .catch(() => setItems([]))
  }, [collection.id])

  // Fetch people/faces/objects detail for the current item
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

  // When page changes while playing, switch src and keep playing
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
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0" onClick={e => e.stopPropagation()}>
        <div>
          <span className="text-white/80 text-[14px] font-medium">{collection.name}</span>
          <span className="text-white/30 text-[12px] ml-3">{TYPE_LABELS[collection.type] || collection.type}</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/70 text-xl leading-none transition-colors">✕</button>
      </div>

      {!items && (
        <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Loading…</div>
      )}

      {items && items.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-white/30 text-sm">No items found.</div>
      )}

      {items && items.length > 0 && (
        <div className="flex flex-col flex-1 min-h-0" onClick={e => e.stopPropagation()}>
          {/* Main view */}
          <div className="flex flex-1 min-h-0">
            {/* Image */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 min-w-0 min-h-0 overflow-hidden">
              {current && (
                <>
                  <div className="relative inline-block">
                    {current.is_video ? (
                      <video src={current.url} poster={current.thumb_url} controls autoPlay
                        className="block max-w-full object-contain rounded-lg shadow-2xl"
                        style={{ maxHeight: isSeries ? 'calc(100vh - 240px)' : 'calc(100vh - 192px)' }} />
                    ) : (
                      <img src={current.url} alt=""
                        className="block max-w-full object-contain rounded-lg shadow-2xl"
                        style={{ maxHeight: isSeries ? 'calc(100vh - 240px)' : 'calc(100vh - 192px)' }} />
                    )}
                    {current.audio_url && (
                      <button onClick={toggleAudio}
                        title={current.audio_description || 'Play audio'}
                        className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all
                          ${playing ? 'bg-blue-500/80 text-white' : 'bg-black/60 text-white/70 hover:bg-black/80 hover:text-white'}`}>
                        {playing ? '⏹' : '🔊'}
                      </button>
                    )}
                  </div>
                  <audio ref={audioRef} onEnded={() => setPlaying(false)} />
                  {isSeries && (
                    <div className="flex items-center gap-4 mt-3 shrink-0">
                      <button onClick={prev} disabled={selected === 0}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-20 text-white/60 text-[12px] rounded transition-colors">
                        ← Prev
                      </button>
                      <span className="text-white/30 text-[12px]">
                        {current.page_number != null ? `Page ${current.page_number}` : `${selected + 1} / ${items.length}`}
                      </span>
                      <button onClick={next} disabled={selected === items.length - 1}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-20 text-white/60 text-[12px] rounded transition-colors">
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Metadata panel */}
            {current && (
              <div className="w-72 shrink-0 border-l border-white/8 overflow-y-auto p-4 space-y-4 bg-black/20">
                {current.content_date && (
                  <div>
                    <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1">Date</p>
                    <p className="text-white/70 text-[13px]">{current.content_date}</p>
                    {current.content_date_explanation && (
                      <p className="text-white/30 text-[10px] mt-0.5 italic">{current.content_date_explanation}</p>
                    )}
                  </div>
                )}
                {current.context_subject && (
                  <div>
                    <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1">Subject</p>
                    <p className="text-white/70 text-[13px]">{current.context_subject}</p>
                  </div>
                )}
                {current.place_name && (
                  <div>
                    <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1">Place</p>
                    <p className="text-white/70 text-[13px]">{current.place_name}</p>
                  </div>
                )}

                {/* People — assigned */}
                {detail?.people?.length > 0 && (
                  <div>
                    <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1.5">People</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.people.map(p => (
                        <a key={p.id} href={`/manage/people/${p.id}`}
                          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-full pl-0.5 pr-2 py-0.5 transition-colors">
                          {p.crop_url
                            ? <img src={p.crop_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                            : <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white/40">{(p.known_as || p.name || '?')[0]}</span>}
                          <span className="text-white/60 text-[11px]">{p.known_as || p.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unidentified faces */}
                {detail?.unidentified?.length > 0 && (
                  <div>
                    <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1.5">
                      Unidentified faces ({detail.unidentified.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {detail.unidentified.map(f => (
                        <img key={f.face_index} src={f.crop_url} alt=""
                          title={`Face ${f.face_index}`}
                          className="w-9 h-9 rounded object-cover border border-white/10" loading="lazy" />
                      ))}
                    </div>
                  </div>
                )}

                {current.context_notes && (
                  <div>
                    <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1">Notes</p>
                    <p className="text-white/50 text-[12px] leading-relaxed">{current.context_notes}</p>
                  </div>
                )}
                {current.description && (
                  <div>
                    <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1">Description</p>
                    <p className="text-white/50 text-[12px] leading-relaxed">{current.description}</p>
                  </div>
                )}
                {current.transcription && (
                  <div>
                    <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1">Transcription</p>
                    <p className="text-white/40 text-[11px] leading-relaxed whitespace-pre-wrap font-mono">{current.transcription}</p>
                  </div>
                )}
                {(current.physical_status || current.physical_condition) && (
                  <div>
                    <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1">Physical original</p>
                    <p className="text-white/50 text-[12px]">
                      {current.physical_status}{current.physical_condition ? ` · ${current.physical_condition}` : ''}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thumbnail strip — bottom */}
          <div className="h-24 shrink-0 border-t border-white/8 bg-black/40 flex gap-0.5 overflow-x-auto">
            {items.map((item, i) => (
              <button key={i} onClick={() => setSelected(i)}
                className={`h-full aspect-square shrink-0 overflow-hidden relative transition-all ${selected === i ? 'ring-2 ring-inset ring-blue-400' : 'opacity-50 hover:opacity-80'}`}>
                <img src={item.is_video ? item.thumb_url : item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                {item.is_video && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/80 text-lg pointer-events-none drop-shadow">▶</div>
                )}
                {isSeries && item.page_number != null && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-white/60 text-center py-0.5">
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

