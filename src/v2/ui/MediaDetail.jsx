import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { describeMedia, bust } from './mediaTileProps'
import { InfoPanel } from './MediaInfoPanel'
import { Edge } from './DetailControls'
import { FaceBoxes } from './FaceBoxes'
import { C } from './tokens'
import { CropOverlay } from './CropOverlay'
import { DetailToolbar } from './DetailToolbar'
import { useElementRect } from '../lib/useElementRect'
import { useIsWide } from '../lib/useIsWide'

/**
 * One photograph, full size. Placeholder — the photo, a way out, nothing else.
 *
 * Presentational, like everything else here: it takes an item and reports
 * intent. The overlay is a plain fixed div rather than anything clever, so a
 * route can render this same component later without changing it.
 */
// Start on the middle two thirds: a rectangle identical to the picture gives
// nothing to grab hold of.
const DEFAULT_BOX = { x1: 1 / 6, y1: 1 / 6, x2: 5 / 6, y2: 5 / 6 }

/** How much to shrink a turned photograph so its corners stay in the pane. */
function fitScale(angle) {
  const r = (Math.abs(angle) * Math.PI) / 180
  return 1 / (Math.cos(r) + Math.sin(r))
}

/**
 * Fractions of what is on screen become pixels of the full-size photograph.
 * The API maps those onto the stored file, which may be lying on its side.
 */
async function applyCrop({ item, box, angle, imgRef, onCrop, setCropping, setCrop, setAngle }) {
  let w = item.width || imgRef.current?.naturalWidth
  let h = item.height || imgRef.current?.naturalHeight
  if (!w || !h) return
  // The rectangle was drawn on the STRAIGHTENED picture, which is bigger than
  // the original — turning a rectangle and keeping its corners always is. The
  // server rotates with expand as well, so both agree on this size.
  if (angle) {
    const r = (Math.abs(angle) * Math.PI) / 180
    const [cos, sin] = [Math.cos(r), Math.sin(r)]
    ;[w, h] = [w * cos + h * sin, w * sin + h * cos]
  }
  const rect = {
    x: Math.round(box.x1 * w),
    y: Math.round(box.y1 * h),
    w: Math.round((box.x2 - box.x1) * w),
    h: Math.round((box.y2 - box.y1) * h),
    angle,
  }
  // The server refuses anything under 32px a side, and a refused request looks
  // exactly like a button that does nothing.
  if (rect.w < 32 || rect.h < 32) return
  setCropping(true)
  try {
    await onCrop(item, rect)
    setCrop(false)
    // The file is straight now, so the preview must stop turning it. Leaving
    // the transform on meant the photograph looked as crooked as before until
    // the page was reloaded — the crop had worked, the browser was still
    // rotating the result.
    setAngle(0)
  } finally {
    setCropping(false)
  }
}

export function MediaDetail({
  item,
  onClose,
  // Every action is optional: a button appears only when something can handle
  // it. An album view has no business offering "set as cover", and a search
  // result probably should not offer delete.
  favourited = false,
  onToggleFavourite,
  onRotate,
  onCrop,
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
  // Crop lives in the detail view because it needs the photograph at a size
  // worth drawing on. Fractions of the displayed image, converted to pixels
  // only when sent.
  const [crop, setCrop] = useState(false)
  const [box, setBox] = useState(DEFAULT_BOX)
  const [cropping, setCropping] = useState(false)
  const [angle, setAngle] = useState(0)
  const cropRect = useElementRect(imgRef, crop ? `${angle}` : null)

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
          <DetailToolbar
            item={item}
            wide={wide}
            favourited={favourited}
            showInfo={showInfo}
            confirmDelete={confirmDelete}
            onClose={onClose}
            onToggleFavourite={onToggleFavourite}
            onAddToAlbum={onAddToAlbum}
            onRotate={onRotate}
            onStartCrop={() => { setCrop(true); setBox(DEFAULT_BOX); setAngle(0) }}
            onCrop={onCrop}
            onDownload={onDownload}
            onDelete={onDelete}
            onConfirmDelete={setConfirmDelete}
            onToggleInfo={() => { setShowInfo(v => !v); onShowInfo?.(item) }}
          />
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
            // Straightening turns the picture and leaves the crop box upright.
            // Shrunk to fit while turned, so the corners stay on screen.
            transform: angle ? `rotate(${angle}deg) scale(${fitScale(angle)})` : undefined,
            transition: 'none',
          }}
        />
      )}

        {crop && cropRect && (
        <CropOverlay
          box={box}
          imageRect={cropRect}
          onChange={setBox}
          busy={cropping}
          onCancel={() => setCrop(false)}
          angle={angle}
          onAngle={setAngle}
          imageSize={{ w: item.width || 0, h: item.height || 0 }}
          onApply={() => applyCrop({ item, box, angle, imgRef, onCrop, setCropping, setCrop, setAngle })}
        />
      )}

        {/* Over the photograph, inside the same box, so the coordinates line
            up without any extra offset maths. */}
        {!crop && <FaceBoxes
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
        />}
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
