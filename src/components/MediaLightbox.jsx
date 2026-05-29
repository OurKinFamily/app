import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { X, ChevronLeft, ChevronRight, Heart, RotateCw, Download, Trash2, Album, Volume2, Square, Image as ImageIcon, Palette } from 'lucide-react'
import { cn } from '../lib/cn'
import { IconButton } from './IconButton'
import { FaceAssignPopover } from './FaceAssignPopover'
import { MediaLightboxSheet } from './MediaLightboxSheet'
import { bboxRect, onMediaError } from './mediaLightboxHelpers'

// Lightbox shell. Detail content via renderDetail(item, ctx).
// ctx: { setHighlight, setFaces, setFaceClickHandler } — lets the detail panel
// drive face-bbox highlights and receive clicks on face regions over the image.
export function MediaLightbox({
  items, initialIndex = 0, title,
  favorites, onFavorite, onRotate, onDownload, onDelete, onSetCover, currentCoverPath,
  onClose, onNavigate, onNeedMore, onAlbum, onMosaic, renderDetail, children,
}) {
  const [index, setIndex] = useState(initialIndex)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [chrome, setChrome] = useState(true)
  const [rotation, setRotation] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [highlight, setHighlight] = useState(null)
  const [faces, setFaces] = useState([])
  const [assignAt, setAssignAt] = useState(null)
  const [detailV, setDetailV] = useState(0)
  const [, setImgTick] = useState(0)
  // audio: { url, description } | null — published by MediaDetail when the
  // current item carries heritage.audio_url. Lightbox renders a toggle action
  // when set; playback is managed by the lightbox so it survives detail
  // re-renders but stops on item navigation.
  const [audio, setAudio] = useState(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef(null)
  const touch = useRef(null)
  const mediaRef = useRef(null)

  const bumpDetail = useCallback(() => setDetailV(v => v + 1), [])
  const openAssign = useCallback((face, x, y) => setAssignAt({ face, x, y }), [])
  const ctx = useMemo(
    () => ({ setHighlight, setFaces, openAssign, setSheetOpen, bumpDetail, setAudio }),
    [openAssign, bumpDetail],
  )

  const toggleAudio = () => {
    const el = audioRef.current
    if (audioPlaying) { el.pause(); el.currentTime = 0; setAudioPlaying(false) }
    else { el.src = audio.url; el.play().catch(() => setAudioPlaying(false)); setAudioPlaying(true) }
  }

  const go = useCallback(delta => {
    setIndex(i => {
      const next = i + delta
      if (next < 0 || next >= items.length) return i
      if (next >= items.length - 8) onNeedMore?.()
      return next
    })
    setRotation(0)
    setConfirmDelete(false)
    setHighlight(null)
    setFaces([])
    setAssignAt(null)
    audioRef.current?.pause()
    setAudioPlaying(false)
    setAudio(null)
  }, [items.length, onNeedMore])

  // Lock body scroll while the lightbox is open. `overflow: hidden` alone
  // doesn't stop iOS Safari — pin body with position:fixed + restore scroll on close.
  useEffect(() => {
    const y = window.scrollY
    const b = document.body.style
    b.position = 'fixed'
    b.top = `-${y}px`
    b.left = '0'
    b.right = '0'
    b.overflow = 'hidden'
    return () => {
      b.position = ''
      b.top = ''
      b.left = ''
      b.right = ''
      b.overflow = ''
      window.scrollTo(0, y)
    }
  }, [])

  useEffect(() => {
    if (items[index]) onNavigate?.(items[index])
  }, [index])

  // Preload neighbors so left/right is snappy.
  useEffect(() => {
    const preload = i => {
      const it = items[i]
      if (!it || it.is_video) return
      const src = it.path ? `/api/media/medium/${it.path}` : (it.url || it.thumbnail_url)
      if (src) { const img = new Image(); img.src = src }
    }
    preload(index - 1)
    preload(index + 1)
  }, [index, items])

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [go, onClose])

  const item = items[index]
  if (!item) return null

  const canPrev = index > 0
  const canNext = index < items.length - 1
  // Photos use the resized medium endpoint to avoid serving multi-MB originals to the lightbox.
  const src = item.is_video
    ? (item.url || item.thumbnail_url)
    : (item.path ? `/api/media/medium/${item.path}` : (item.url || item.thumbnail_url))
  const fav = favorites?.has(item.path)
  const detail = renderDetail ? renderDetail(item, ctx, detailV) : (children || <DetailPlaceholder />)
  const rotate = () => { setRotation(r => (r + 90) % 360); onRotate?.(item, 90) }

  const chromeCls = cn(
    'transition-opacity duration-200 md:opacity-100 md:pointer-events-auto',
    chrome ? 'opacity-100' : 'opacity-0 pointer-events-none',
  )

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-black md:flex-row">
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
        onTouchEnd={e => {
          if (!touch.current) return
          const dx = e.changedTouches[0].clientX - touch.current.x
          const dy = e.changedTouches[0].clientY - touch.current.y
          touch.current = null
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          else if (dy < -70 && !sheetOpen) setSheetOpen(true)
          else if (dy > 70 && !sheetOpen) onClose()
        }}
      >
        <div className={cn('absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent p-3', chromeCls)}>
          <IconButton label="Close" onClick={onClose}><X size={20} /></IconButton>
          {title && <span className="truncate text-[13px] text-white/80">{title}</span>}
          <div className="ml-auto flex items-center gap-1">
            {onFavorite && (
              <IconButton label="Favorite" active={fav} onClick={() => onFavorite(item)}>
                <Heart size={18} className={fav ? 'fill-red-500' : ''} />
              </IconButton>
            )}
            {onRotate && <IconButton label="Rotate" onClick={rotate}><RotateCw size={18} /></IconButton>}
            {onAlbum && <IconButton label="Add to album" onClick={() => onAlbum(item)}><Album size={18} /></IconButton>}
            {onMosaic && <IconButton label="Mosaic" onClick={() => onMosaic(item)}><Palette size={18} /></IconButton>}
            {onSetCover && (
              <IconButton
                label={item?.path === currentCoverPath ? 'Current cover' : 'Set as cover'}
                onClick={() => onSetCover(item)}
                className={item?.path === currentCoverPath ? 'text-green-400 hover:text-green-300' : ''}
              >
                <ImageIcon size={18} />
              </IconButton>
            )}
            {onDownload && <IconButton label="Download" onClick={() => onDownload(item)}><Download size={18} /></IconButton>}
            {audio?.url && (
              <IconButton
                label={audio.description || 'Play audio'}
                active={audioPlaying}
                onClick={toggleAudio}
              >
                {audioPlaying ? <Square size={18} /> : <Volume2 size={18} />}
              </IconButton>
            )}
            {onDelete && <IconButton label="Delete" onClick={() => setConfirmDelete(true)}><Trash2 size={18} /></IconButton>}
          </div>
        </div>
        <audio ref={audioRef} onEnded={() => setAudioPlaying(false)} className="hidden" />

        {canPrev && (
          <button onClick={e => { e.stopPropagation(); go(-1) }} aria-label="Previous"
            className={cn('absolute left-2 z-10 hidden h-10 w-10 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white md:flex', chromeCls)}>
            <ChevronLeft size={26} />
          </button>
        )}

        {item.is_video ? (
          <video key={src} src={src} controls className="max-h-full max-w-full object-contain" />
        ) : (
          <img
            ref={mediaRef} key={src} src={src} alt={item.filename || ''}
            onClick={() => setChrome(c => !c)}
            onLoad={() => setImgTick(t => t + 1)}
            onError={e => onMediaError(e, item)}
            style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
            className="max-h-full max-w-full object-contain transition-transform duration-200"
          />
        )}

        {!item.is_video && mediaRef.current?.naturalWidth > 0 && faces.map(f => {
          const r = bboxRect(mediaRef.current, f.bbox)
          const key = f.identified ? `p${f.person.id}` : `f${f.face.face_index}`
          return (
            <div key={key} style={{ position: 'absolute', ...r }}
              onMouseEnter={() => setHighlight({ bbox: f.bbox, label: f.label })}
              onMouseLeave={() => setHighlight(null)}
              onClick={f.identified ? undefined : e => setAssignAt({ face: f.face, x: e.clientX, y: e.clientY })}
              className={f.identified ? 'cursor-default' : 'cursor-pointer'}
            />
          )
        })}

        {!item.is_video && (highlight?.bbox || assignAt?.face?.bbox) && mediaRef.current?.naturalWidth > 0 && (() => {
          const active = highlight?.bbox ? highlight : { bbox: assignAt.face.bbox }
          const r = bboxRect(mediaRef.current, active.bbox, 2)
          return (
            <div className="pointer-events-none absolute rounded border-2 border-white/80"
              style={{ ...r, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}>
              {active.label && (
                <div className="absolute -bottom-6 left-0 whitespace-nowrap rounded bg-black/80 px-2 py-0.5 text-[11px] text-white">
                  {active.label}
                </div>
              )}
            </div>
          )
        })()}
        {canNext && (
          <button onClick={e => { e.stopPropagation(); go(1) }} aria-label="Next"
            className={cn('absolute right-2 z-10 hidden h-10 w-10 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white md:flex', chromeCls)}>
            <ChevronRight size={26} />
          </button>
        )}

        <div className={cn('absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] tabular-nums text-white/30', chromeCls)}>
          {index + 1} / {items.length}
        </div>

        {confirmDelete && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70" onClick={() => setConfirmDelete(false)}>
            <div className="w-[300px] rounded-xl border border-white/10 bg-zinc-900 p-5" onClick={e => e.stopPropagation()}>
              <p className="mb-1 text-sm text-white">Delete this item?</p>
              <p className="mb-4 text-[12px] text-white/40">This can't be undone.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-[13px] text-white/50 transition-colors hover:text-white">Cancel</button>
                <button onClick={() => { setConfirmDelete(false); onDelete(item) }} className="rounded-lg bg-red-600/80 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-red-600">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-white/10 p-4 md:block">{detail}</aside>

      <MediaLightboxSheet open={sheetOpen} setOpen={setSheetOpen}>{detail}</MediaLightboxSheet>

      {assignAt && (
        <FaceAssignPopover
          face={assignAt.face}
          photoPath={item.path}
          x={assignAt.x}
          y={assignAt.y}
          onClose={() => setAssignAt(null)}
          onAssigned={bumpDetail}
        />
      )}
    </div>
  )
}

function DetailPlaceholder() {
  return <p className="text-[12px] text-white/30">Detail panel — coming next (people, date, location, exif).</p>
}
