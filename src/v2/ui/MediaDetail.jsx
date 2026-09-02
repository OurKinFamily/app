import { useEffect, useRef, useState } from 'react'
import {
  X, Heart, RotateCw, Download, Trash2, Album, Info,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { describeMedia, bust } from './mediaTileProps'
import { InfoPanel } from './MediaInfoPanel'
import { ConfirmPopover } from './ConfirmPopover'
import { Action, Edge } from './DetailControls'
import { FaceBoxes } from './FaceBoxes'
import { C } from './tokens'

/**
 * One photograph, full size. Placeholder — the photo, a way out, nothing else.
 *
 * Presentational, like everything else here: it takes an item and reports
 * intent. The overlay is a plain fixed div rather than anything clever, so a
 * route can render this same component later without changing it.
 */
export function MediaDetail({
  item,
  onClose,
  // Every action is optional: a button appears only when something can handle
  // it. An album view has no business offering "set as cover", and a search
  // result probably should not offer delete.
  favourited = false,
  onToggleFavourite,
  onRotate,
  onDownload,
  onDelete,
  onAddToAlbum,
  onShowInfo,
  detail,                  // supplied by the style guide; otherwise fetched
  onRedate,
  onRelocate,
  onAssignFace,
  onCreatePerson,
  onDismissFace,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}) {
  const wide = useIsWide()
  // Open by default: in a family archive the facts are half the point, and
  // hiding them behind a button means they are rarely looked at.
  const [showInfo, setShowInfo] = useState(true)
  // Shared between the picture and the panel: hovering a face in one
  // highlights it in the other. Lives here because it is the only thing both
  // sides can see.
  const [hoveredFace, setHoveredFace] = useState(null)
  // Which face is being named. Lives here because it can be started from the
  // photograph or from the panel, and only one of them can be open at a time.
  const [namingFace, setNamingFace] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [detailData, setDetailData] = useState(null)
  const imgRef = useRef(null)

  const faces = [
    ...((detailData?.people || []).map(pp => ({
      face_index: pp.face_index, bbox: pp.bbox, name: pp.known_as || pp.name,
    }))),
    ...((detailData?.unidentified || []).map(f => ({
      face_index: f.face_index, bbox: f.bbox, name: null,
      crop_url: f.crop_url,
    }))),
  ].filter(f => f.bbox)
  useEffect(() => {
    const onKey = e => {
      // Never steal a keystroke from a field: the panel has a description box,
      // a date picker and a person search in it.
      if (e.target.matches?.('input, textarea, select, [contenteditable]')) return
      if (e.key === 'Escape') onClose?.()
      else if (e.key === 'ArrowLeft' && hasPrev) { e.preventDefault(); onPrev?.() }
      else if (e.key === 'ArrowRight' && hasNext) { e.preventDefault(); onNext?.() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  // Lock the page behind the overlay. Without this the grid keeps its
  // scrollbar, which both looks wrong over a full-screen photograph and lets a
  // stray wheel event scroll 8 million pixels of timeline out from under you.
  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [])

  if (!item) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: C.bg, color: C.text,
        // Wide: photograph and facts side by side. Narrow: the photograph
        // fills the screen and the facts are below it, reached by scrolling —
        // there is no room for a column, and a drawer would hide them.
        display: 'flex',
        flexDirection: wide ? 'row' : 'column',
        // dvh, not vh: on mobile browsers vh includes the retracting toolbar,
        // so the bottom of the picture would sit under it.
        width: '100vw', height: '100dvh',
        overflowY: wide ? 'hidden' : 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'relative',
          flex: wide ? 1 : '0 0 auto',
          minWidth: 0, minHeight: 0,
          width: wide ? undefined : '100%',
          height: wide ? '100%' : '100dvh',
          display: 'grid', placeItems: 'center',
          // Dark only behind the photograph, so a bright picture has something
          // to sit against without the whole overlay going black.
          background: '#111',
          padding: 16, boxSizing: 'border-box',
        }}
      >
        {/* Chrome floats over the photograph rather than boxing it in, so the
            picture is never letterboxed by furniture. Same scrim idea as the
            tile's overlay bands. */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
            display: 'flex', alignItems: 'center', gap: 2,
            padding: 8, boxSizing: 'border-box',
            background: 'linear-gradient(to bottom, rgba(0,0,0,.55), transparent)',
          }}
        >
          <Action label="Close" onClick={onClose}><X size={17} /></Action>

          <div style={{ flex: 1 }} />

          {onToggleFavourite && (
            <Action
              label={favourited ? 'Remove from favourites' : 'Add to favourites'}
              onClick={() => onToggleFavourite(item)}
            >
              <Heart
                size={20}
                fill={favourited ? '#e8384f' : 'none'}
                color={favourited ? '#e8384f' : 'currentColor'}
              />
            </Action>
          )}
          {onAddToAlbum && (
            <Action label="Add to album" onClick={() => onAddToAlbum(item)}>
              <Album size={17} />
            </Action>
          )}
          {onRotate && (
            <Action label="Rotate" onClick={() => onRotate(item)}>
              <RotateCw size={17} />
            </Action>
          )}
          {onDownload && (
            <Action label="Download" onClick={() => onDownload(item)}>
              <Download size={17} />
            </Action>
          )}
          {onDelete && (
            <span style={{ position: 'relative' }}>
              <Action label="Delete" onClick={() => setConfirmDelete(true)} danger>
                <Trash2 size={17} />
              </Action>
              {confirmDelete && (
                <ConfirmPopover
                  align="right"
                  message="Move this to the trash?"
                  detail="The file and its sidecars move to /photos/trash and can be put back. Face assignments on it are lost."
                  confirmLabel="Yes, delete"
                  onCancel={() => setConfirmDelete(false)}
                  onConfirm={async () => {
                    await onDelete(item)
                    setConfirmDelete(false)
                  }}
                />
              )}
            </span>
          )}
          {/* Only useful where the panel is a panel. On a narrow screen it is
              simply below the photograph, and you scroll to it. */}
          {wide && (
            <Action
              label={showInfo ? 'Hide details' : 'Show details'}
              onClick={() => { setShowInfo(v => !v); onShowInfo?.(item) }}
            >
              <Info size={17} />
            </Action>
          )}
        </div>
      {/* Big edge targets rather than small buttons: moving through a
          hundred photographs should not require aiming. */}
      {hasPrev && (
        <Edge side="left" label="Previous" onClick={onPrev}>
          <ChevronLeft size={26} />
        </Edge>
      )}
      {hasNext && (
        <Edge side="right" label="Next" onClick={onNext}>
          <ChevronRight size={26} />
        </Edge>
      )}

      {item.is_video ? (
        <video
          src={bust(item.url, item.version)}
          poster={bust(item.thumbnail_url, item.version)}
          controls
          // min-height 0 so the grid item is allowed to shrink; without it a
          // tall video overflows instead of fitting.
          style={{ maxWidth: '100%', maxHeight: '100%', minHeight: 0, minWidth: 0 }}
        />
      ) : (
        <img
          ref={imgRef}
          src={bust(item.url, item.version)}
          alt={describeMedia(item)}
          style={{
            maxWidth: '100%', maxHeight: '100%',
            minHeight: 0, minWidth: 0,
            objectFit: 'contain',
          }}
        />
      )}

        {/* Over the photograph, inside the same box, so the coordinates line
            up without any extra offset maths. */}
        <FaceBoxes
          imgRef={imgRef}
          faces={faces}
          hovered={hoveredFace}
          onHover={setHoveredFace}
          onPick={f => {
            // Only unnamed faces open the namer; clicking a named one should
            // not offer to rename somebody by accident.
            if (f.name) return
            // The panel is where the namer appears, so make sure it is open —
            // otherwise the click does nothing visible on a narrow window.
            setShowInfo(true)
            setNamingFace(f)
          }}
        />
      </div>

      {(showInfo || !wide) && (
        <InfoPanel
          item={item}
          wide={wide}
          detail={detail}
          onDetail={setDetailData}
          hoveredFace={hoveredFace}
          onHoverFace={setHoveredFace}
          onRedate={onRedate}
          onRelocate={onRelocate}
          onAssignFace={onAssignFace}
          onCreatePerson={onCreatePerson}
          onDismissFace={onDismissFace}
          naming={namingFace}
          onNaming={setNamingFace}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  )
}


/** True on a screen wide enough for a side panel. */
function useIsWide() {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 900,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const on = e => setWide(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [setWide])
  return wide
}
