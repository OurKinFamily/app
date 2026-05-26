import { useState } from 'react'
import { DetailSection } from './DetailSection'
import { Field } from './Field'
import { Tag } from './Tag'
import { Swatch } from './Swatch'
import { MiniMap } from './MiniMap'

const CONF_TONE = { high: 'green', medium: 'amber', low: 'red' }

function formatDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatSize(bytes) {
  if (bytes == null) return null
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${Math.round(bytes / 1e3)} KB`
}

// All the data-only sections of the lightbox detail panel. No state, no
// callbacks. People / Unidentified / "Add person" live in MediaDetail itself;
// this is everything else (heritage + sidecar metadata) rendered in the
// natural top-to-bottom order.
//
// Inputs:
//   sidecar  — parsed sidecar metadata block (timestamps, location, camera, …)
//   heritage — derived Neo4j-Media-node block (content_date, title, notes, …)
export function MediaDetailMeta({ sidecar, heritage }) {
  const ts          = sidecar?.timestamps?.primary || {}
  const loc         = sidecar?.location || {}
  const primaryLoc  = loc.primary || {}
  const geoloc      = loc.geolocation || {}
  const landmarks   = loc.landmarks || []
  const topLandmark = landmarks.find(l => (l?.confidence ?? 0) >= 0.8)
  const camera      = sidecar?.camera
  const settings    = sidecar?.settings
  const media       = sidecar?.media || {}
  const dims        = media.dimensions || {}
  const cameraLabel = [camera?.make, camera?.model].filter(Boolean).join(' ')
  const orientation = dims.orientation

  // Heritage content_date wins over EXIF when present (it's a human-curated
  // date, not just the file's recording time).
  const dateValue   = heritage?.content_date || ts?.timestamp
  const dateSource  = heritage?.content_date ? (heritage.content_date_source || 'manual') : ts?.source
  const dateConf    = heritage?.content_date ? (heritage.content_date_precision || 'high') : ts?.confidence
  const dateExplain = heritage?.content_date_explanation

  return (
    <>
      {dateValue && (
        <DetailSection title="Date">
          <p className="mb-2 text-[13px] text-white/80">
            {heritage?.content_date ? heritage.content_date : formatDate(dateValue)}
          </p>
          {dateExplain && <p className="-mt-1 mb-2 text-[11px] italic text-white/40">{dateExplain}</p>}
          <Field label="Source" value={dateSource} />
          <Field
            label="Confidence"
            value={dateConf
              ? <Tag tone={CONF_TONE[dateConf] || 'default'} className="uppercase">{dateConf}</Tag>
              : null}
          />
        </DetailSection>
      )}

      {(heritage?.place_name || primaryLoc.latitude != null || geoloc.city) && (
        <DetailSection title="Location">
          {primaryLoc.latitude != null && (
            <div className="mb-2"><MiniMap lat={primaryLoc.latitude} lng={primaryLoc.longitude} /></div>
          )}
          {heritage?.place_name && <Field label="Place" value={heritage.place_name} />}
          {geoloc.city && (geoloc.confidence ?? 0) >= 0.5 && (
            <Field label="City" value={`${geoloc.city}${geoloc.state_code ? `, ${geoloc.state_code}` : ''}`} />
          )}
          {topLandmark && (
            <Field label="Near" value={`${topLandmark.landmark?.name} (${Math.round((topLandmark.distance || 0))}m)`} />
          )}
          {primaryLoc.latitude != null && (
            <Field label="GPS" value={`${primaryLoc.latitude.toFixed(5)}, ${primaryLoc.longitude.toFixed(5)}`} />
          )}
        </DetailSection>
      )}

      {heritage?.context_notes && (
        <DetailSection title="Notes">
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-white/65">{heritage.context_notes}</p>
        </DetailSection>
      )}

      {heritage?.description && (
        <DetailSection title="Description">
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-white/65">{heritage.description}</p>
        </DetailSection>
      )}

      {heritage?.transcription && <Transcription text={heritage.transcription} />}

      {heritage?.poster_label && (
        <DetailSection title="Poster">
          <p className="text-[12px] text-white/60">{heritage.poster_label}</p>
        </DetailSection>
      )}

      {cameraLabel && (
        <DetailSection title={`Camera — ${cameraLabel}`}>
          {camera?.lens && camera.lens !== cameraLabel && <Field label="Lens" value={camera.lens} />}
        </DetailSection>
      )}

      {settings && (
        <DetailSection title="Exposure">
          <Field label="ISO" value={settings.iso} />
          <Field label="Aperture" value={settings.aperture != null ? `f/${settings.aperture}` : null} />
          <Field label="Shutter" value={settings.shutterSpeed} />
          <Field label="Focal length" value={settings.focalLength} />
          <Field label="Flash" value={settings.flash} />
        </DetailSection>
      )}

      <DetailSection title="File">
        <Field label="Size" value={formatSize(sidecar?.file?.size)} />
        {dims.width ? <Field label="Dimensions" value={`${dims.width} × ${dims.height}`} /> : null}
        <Field label="Megapixels" value={dims.megapixels ? `${dims.megapixels} MP` : null} />
        <Field label="Format" value={media.format} />
        <Field label="Orientation" value={orientation && !/unknown/i.test(orientation) ? orientation : null} />
      </DetailSection>

      {(media.dominantColor || media.meanColor || media.salientColor) && (
        <DetailSection title="Colors">
          <Swatch color={media.dominantColor} label="Dominant" />
          <Swatch color={media.meanColor} label="Mean" />
          <Swatch color={media.salientColor} label="Salient" />
        </DetailSection>
      )}

      {(heritage?.physical_status || heritage?.physical_condition) && (
        <DetailSection title="Physical original">
          <Field label="Status" value={heritage.physical_status} />
          <Field label="Condition" value={heritage.physical_condition} />
        </DetailSection>
      )}

      {(heritage?.collection_id || heritage?.page_number) && (
        <DetailSection title="Provenance">
          <Field label="Page" value={heritage.page_number} />
          {heritage.collection_id && (
            <Field
              label="Collection"
              value={
                <a href={`/manage/collections/${heritage.collection_id}`} className="text-white/70 hover:text-white">
                  open
                </a>
              }
            />
          )}
        </DetailSection>
      )}

      {heritage?.audio_description && (
        <DetailSection title="Audio">
          <p className="text-[12px] text-white/60">{heritage.audio_description}</p>
        </DetailSection>
      )}

      {/* Processing — keep last as it's least interesting day-to-day. */}
      {sidecar?.processing?.processor && (
        <DetailSection title="Processing">
          <Field label="Processor" value={sidecar.processing.processor} />
          <Field label="Extracted" value={formatDate(sidecar.processing.extractedAt)} />
        </DetailSection>
      )}
    </>
  )
}

// Collapse long transcriptions to 5 lines by default with a Show more / less
// toggle. Uses CSS line-clamp — no string slicing, full text stays selectable.
function Transcription({ text }) {
  const [expanded, setExpanded] = useState(false)
  const needsToggle = text.length > 280 || text.split('\n').length > 5
  return (
    <DetailSection title="Transcription">
      <p
        className={
          'whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-white/55 ' +
          (expanded || !needsToggle ? '' : 'line-clamp-5')
        }
      >
        {text}
      </p>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-[11px] text-white/40 transition-colors hover:text-white/70"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </DetailSection>
  )
}
