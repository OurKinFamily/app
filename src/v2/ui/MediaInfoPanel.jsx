import { useEffect, useState } from 'react'
import {
  X, Calendar, MapPin, Palette, HardDrive,
  Users, Box, Sparkles, Image as ImageIcon,
} from 'lucide-react'
import { useIsAdmin } from '../../contexts/MeContext'
import { C } from './tokens'
import { Row, SectionLabel } from './InfoPanelParts'
import { PeopleSection } from './PeopleSection'
import { Readiness } from './Readiness'
import { ExposureSection } from './ExposureSection'
import { PlaceMap } from './PlaceMap'
import { DateEditor } from './DateEditor'
import { LocationEditor } from './LocationEditor'
import { bytes } from './formatBytes'

/**
 * Everything known about one photograph.
 *
 * Laid out the way Google Photos does it — a close and a title, a description
 * you can write, the people in it, then icon-led rows whose second line carries
 * the specifics — but showing rather more, because the archive knows more:
 * three extracted colours rather than one, a nearest landmark, detected faces
 * ready to be tagged, and detected objects.
 *
 * The grid only carries a thin set of fields, so this fetches /gallery/detail
 * for the rest. Everything degrades: a row with nothing to say does not render.
 */

function useMediaDetail(path) {
  // Stamped with the path it belongs to, so switching photographs invalidates
  // the old detail during render rather than via an effect that sets state and
  // triggers a second pass.
  const [state, setState] = useState({ path, detail: null })
  if (state.path !== path) setState({ path, detail: null })

  useEffect(() => {
    if (!path) return
    let alive = true
    fetch(`/api/gallery/detail?path=${encodeURIComponent(path)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive) setState({ path, detail: d }) })
      .catch(() => {})
    return () => { alive = false }
  }, [path])

  return state.path === path ? state.detail : null
}


export function InfoPanel({
  item, wide, onClose, detail: supplied,
  onDetail, hoveredFace, onHoverFace,
  onRedate, onRelocate, onAssignFace, onCreatePerson, onDismissFace,
  naming, onNaming,
}) {
  // Editing is owner-only, the same gate v1 puts on tagging people. Family can
  // read the archive; correcting the record is a different thing. Hidden
  // rather than disabled — an affordance you can never use is just noise.
  const canEdit = useIsAdmin()
  const [editingDate, setEditingDate] = useState(false)
  const [editingPlace, setEditingPlace] = useState(false)
  // A supplied detail skips the fetch entirely — that's how the style guide
  // pins its examples so they can't drift when the archive does.
  const fetched = useMediaDetail(supplied ? null : item?.path)
  const detail = supplied || fetched

  // Hand the loaded detail up: the picture needs the bounding boxes, and this
  // is the component that fetched them.
  useEffect(() => { onDetail?.(detail) }, [detail, onDetail])

  const d = detail || {}
  const media = d.media || {}
  const cam = d.camera || {}
  const set = d.settings || {}
  const loc = d.location || {}
  const ts = d.timestamp || {}

  const when = (ts.value || item.timestamp) ? new Date(ts.value || item.timestamp) : null
  const place = [loc.city || item.city, loc.state || item.state, loc.county]
    .filter(Boolean).join(', ')

  const dims = media.width && media.height
    ? `${media.megapixels ? `${media.megapixels}MP   ` : ''}${media.width} × ${media.height}`
    : (item.width ? `${item.width} × ${item.height}` : null)

  const colours = [
    ['dominant', media.dominantColor],
    ['mean', media.meanColor],
    ['salient', media.salientColor],
  ].filter(([, c]) => c)

  return (
    <aside
      style={{
        flex: '0 0 auto',
        width: wide ? 320 : '100%',
        height: wide ? '100%' : 'auto',
        overflowY: wide ? 'auto' : 'visible',
        background: C.bg, color: C.text,
        borderLeft: wide ? `1px solid ${C.border}` : 'none',
        padding: '10px 16px 48px', boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {wide && (
          <button
            type="button" aria-label="Hide details" onClick={onClose}
            style={{
              display: 'grid', placeItems: 'center', width: 26, height: 26,
              border: 0, borderRadius: '50%', background: 'transparent',
              color: C.text, cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        )}
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Info</h2>
      </div>

      {/* Writing about a photograph is half of what an archive is for, so this
          sits above the metadata rather than under it. */}
      <input
        placeholder="Add a description"
        defaultValue={d.heritage?.description || ''}
        style={{
          width: '100%', boxSizing: 'border-box', border: 0,
          borderBottom: `1px solid ${C.border}`, padding: '7px 0',
          fontSize: 13, color: C.text, background: 'transparent', outline: 'none',
        }}
      />

      <PeopleSection
        detail={d}
        hovered={hoveredFace}
        onHover={onHoverFace}
        canEdit={canEdit}
        onAssignFace={onAssignFace}
        onCreatePerson={onCreatePerson}
        onDismissFace={onDismissFace}
        naming={naming}
        onNaming={onNaming}
      />

      {/* ── what ─────────────────────────────────────────────────────────── */}
      <SectionLabel>Details</SectionLabel>

      <Row
        icon={Calendar}
        primary={when?.toLocaleDateString(undefined, {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })}
        secondary={[
          // In the zone it was taken in, not the reader's. A holiday in 1998
          // shown in the current timezone is quietly wrong.
          when?.toLocaleTimeString(undefined, {
            hour: 'numeric', minute: '2-digit',
            timeZone: ts.timezone || undefined,
            timeZoneName: ts.timezone ? 'short' : undefined,
          }),
          // Provenance only when it is worth doubting. A high-confidence EXIF
          // date is the ordinary case and saying so on every photograph trains
          // people to stop reading the line — which is exactly where the
          // low-confidence warning needs to be noticed.
          ts.confidence && ts.confidence !== 'high'
            ? `${ts.confidence} confidence, from ${ts.source}`
            : null,
        ].filter(Boolean).join('   ')}
        onEdit={canEdit ? () => setEditingDate(true) : undefined}
      />

      {editingDate && (
        <DateEditor
          value={ts.value || item.timestamp}
          precision={ts.precision}
          onCancel={() => setEditingDate(false)}
          onSave={async patch => {
            await onRedate?.(item, patch)
            setEditingDate(false)
          }}
        />
      )}

      {/* The camera, then each setting on its own line. Run together as one
          string they read as noise; separated, they are the facts a
          photographer actually looks for. */}

      {/* Full bleed: the panel's padding would otherwise frame it like a
          photograph, which it isn't. */}
      {loc.latitude != null && (
        <div style={{ margin: '10px -16px 2px' }}>
          <PlaceMap lat={loc.latitude} lng={loc.longitude} />
        </div>
      )}

      <Row
        icon={MapPin}
        primary={place || 'No place recorded'}
        secondary={loc.latitude ? (
          <>
            {[
              `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`,
              loc.altitude_m ? `${Math.round(loc.altitude_m)}m up` : null,
              loc.postal_code,
            ].filter(Boolean).join('   ')}
            {/* Nearby named features. They qualify the place rather than being
                a fact of their own, so they sit under it and quieter — the
                nearest is often a hill nobody has heard of while the fourth is
                the lake they were actually at. */}
            {loc.landmarks?.length > 0 && (
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>
                {loc.landmarks.slice(0, 4).map(l => l.name).join(', ')}
              </div>
            )}
          </>
        ) : null}
        onEdit={canEdit ? () => setEditingPlace(true) : undefined}
      />

      {editingPlace && (
        <LocationEditor
          lat={loc.latitude}
          lng={loc.longitude}
          onCancel={() => setEditingPlace(false)}
          onSave={async patch => {
            await onRelocate?.(item, patch)
            setEditingPlace(false)
          }}
        />
      )}
      <Row
        icon={ImageIcon}
        primary={d.filename || item.filename}
        secondary={[dims, media.format?.toUpperCase(), media.orientation]
          .filter(Boolean).join('   ')}
      />



      {/* Nothing in Google Photos does this — the archive knows the nearest
          named feature, which reads better than a coordinate ever will. */}

      {colours.length > 0 && (
        <Row
          icon={Palette}
          primary={
            <span style={{ display: 'flex', gap: 6 }}>
              {colours.map(([label, c]) => (
                // The name and the value both live in the tooltip; a caption
                // spelling out "dominant · mean · salient" under three squares
                // was more words than the squares are worth.
                <span key={c} title={`${label} — ${c}`} style={{
                  width: 20, height: 20, borderRadius: 3, background: c,
                  border: `1px solid ${C.border}`,
                }} />
              ))}
            </span>
          }
        />
      )}

      <Row
        icon={Sparkles}
        primary={media.isLivePhoto ? 'Live Photo' : null}
        secondary={media.liveDuration ? `${media.liveDuration.toFixed(1)}s of motion` : null}
      />



      <Row
        icon={Users}
        primary={d.heritage?.collection}
        secondary={d.heritage?.context?.type}
      />

      <ExposureSection camera={cam} settings={set} />

      <Row
        icon={HardDrive}
        primary={bytes(d.file?.size)}
        secondary={d.file?.mimeType}
      />

      {d.objects?.length > 0 && (
        <Row
          icon={Box}
          primary={[...new Set(d.objects.map(o => o.label || o.name))]
            .slice(0, 8).join(', ')}
          secondary={`${d.objects.length} detected`}
        />
      )}

      <Readiness readiness={d.readiness} />

    </aside>
  )
}
