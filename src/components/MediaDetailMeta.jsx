import { useState, useEffect, useRef } from 'react'
import { Pencil } from 'lucide-react'
import { DetailSection } from './DetailSection'
import { Field } from './Field'
import { Tag } from './Tag'
import { Swatch } from './Swatch'
import { MiniMap } from './MiniMap'
import { redateMedia, setMediaLocation } from '../lib/api'
import { LocationPicker, parseLatLng } from './LocationPicker'
import { useIsAdmin } from '../contexts/MeContext'

const CONF_TONE = { high: 'green', medium: 'amber', low: 'red' }

function formatDate(ts, precision) {
  if (!ts) return null
  const d = new Date(ts)
  if (precision === 'year') return String(d.getFullYear())
  if (precision === 'month') return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Parse user input into {timestamp, precision} for the redate API.
// Accepts: YYYY | YYYY-MM | YYYY-MM-DD. Noon local-time, no tz — server stores as-given.
function parseRedateInput(raw) {
  const v = raw.trim()
  if (/^\d{4}$/.test(v))             return { timestamp: `${v}-01-01T12:00:00`, precision: 'year' }
  if (/^\d{4}-\d{2}$/.test(v))       return { timestamp: `${v}-01T12:00:00`,    precision: 'month' }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { timestamp: `${v}T12:00:00`,       precision: 'day' }
  return null
}

// Pre-fill the input with the current value at the right granularity.
function valueForEdit(ts, precision) {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  if (precision === 'year')  return `${yyyy}`
  if (precision === 'month') return `${yyyy}-${mm}`
  return `${yyyy}-${mm}-${dd}`
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
export function MediaDetailMeta({ sidecar, heritage, path, onRedated }) {
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
  const datePrec    = ts?.precision || 'day'

  return (
    <>
      {dateValue && (
        <DetailSection title="Date">
          <DateEditor
            path={path}
            value={dateValue}
            precision={datePrec}
            isHeritageString={!!heritage?.content_date}
            heritageString={heritage?.content_date}
            onRedated={onRedated}
          />
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
        <LocationEditor
          path={path}
          lat={primaryLoc.latitude}
          lng={primaryLoc.longitude}
          source={primaryLoc.source}
          onLocated={onRedated}
        />
      </DetailSection>

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

// Inline-edit the Media date. Pencil → precision picker (Day/Month/Year) +
// matching native input (date / month / number). Native pickers prevent
// malformed input entirely — no free-text date parsing here.
const MODES = ['day', 'month', 'year']
function DateEditor({ path, value, precision, isHeritageString, heritageString, onRedated }) {
  const isAdmin = useIsAdmin()           // editing the date is owner-only
  const [editing, setEditing] = useState(false)
  const [mode, setMode]       = useState(precision)
  const [d, setD]             = useState('')   // YYYY-MM-DD
  const [m, setM]             = useState('')   // YYYY-MM
  const [y, setY]             = useState('')   // YYYY
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing, mode])

  const start = () => {
    const full = valueForEdit(value, 'day')
    setD(full)
    setM(full.slice(0, 7))
    setY(full.slice(0, 4))
    setMode(precision)
    setError(null)
    setEditing(true)
  }
  const cancel = () => { setEditing(false); setError(null) }

  const draft = mode === 'year' ? y : mode === 'month' ? m : d

  const commit = async () => {
    const parsed = parseRedateInput(draft)
    if (!parsed) { setError('Pick a date'); return }
    const orig = valueForEdit(value, precision)
    if (parsed.precision === precision && draft === orig) { cancel(); return }
    setSaving(true)
    try {
      await redateMedia(path, parsed)
      setEditing(false)
      setError(null)
      onRedated?.()
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Lightbox attaches its Esc handler to `window`. React 17+ stopPropagation
  // forwards to the native event, so this prevents window from also seeing
  // the key and closing the lightbox out from under us.
  const onKeyDown = e => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'Enter') commit()
    else cancel()
  }
  const inputCls = 'w-full rounded border border-white/15 bg-white/5 px-2 py-1 text-[13px] text-white/90 outline-none focus:border-white/40 disabled:opacity-50'

  if (editing) {
    return (
      <div className="mb-2 space-y-2">
        <div className="flex gap-1">
          {MODES.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setMode(opt)}
              disabled={saving}
              className={
                'rounded px-2 py-0.5 text-[11px] uppercase tracking-wide transition-colors ' +
                (mode === opt
                  ? 'bg-white/15 text-white'
                  : 'bg-white/5 text-white/45 hover:text-white/70')
              }
            >
              {opt}
            </button>
          ))}
        </div>
        {mode === 'day' && (
          <input ref={inputRef} type="date" value={d} onChange={e => setD(e.target.value)}
                 onKeyDown={onKeyDown} disabled={saving} className={inputCls} />
        )}
        {mode === 'month' && (
          <input ref={inputRef} type="month" value={m} onChange={e => setM(e.target.value)}
                 onKeyDown={onKeyDown} disabled={saving} className={inputCls} />
        )}
        {mode === 'year' && (
          <input ref={inputRef} type="number" min={1800} max={2100} step={1}
                 value={y} onChange={e => setY(e.target.value)}
                 onKeyDown={onKeyDown} disabled={saving} className={inputCls} placeholder="YYYY" />
        )}
        <div className="flex items-center gap-2">
          <button type="button" onClick={commit} disabled={saving}
                  className="rounded bg-white/15 px-2 py-0.5 text-[11px] text-white transition-colors hover:bg-white/25 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={cancel} disabled={saving}
                  className="text-[11px] text-white/45 transition-colors hover:text-white/70 disabled:opacity-50">
            Cancel
          </button>
        </div>
        {error && <p className="text-[11px] text-rose-400/80">{error}</p>}
      </div>
    )
  }

  return (
    <div className="group mb-2 flex items-center gap-2">
      <p className="text-[13px] text-white/80">
        {isHeritageString ? heritageString : formatDate(value, precision)}
      </p>
      {path && isAdmin && (
        <button
          type="button"
          onClick={start}
          className="text-white/25 opacity-0 transition-opacity hover:text-white/70 group-hover:opacity-100"
          aria-label="Edit date"
        >
          <Pencil size={12} />
        </button>
      )}
    </div>
  )
}

// Manually set / correct a media file's GPS. Pencil (or "Set location" when
// none) → place quick-pick (mmp shortcuts) + lat/lng inputs. Save trickles to
// graph + sidecar + EXIF via the API, then refetches the detail.
function LocationEditor({ path, lat, lng, source, onLocated }) {
  const isAdmin = useIsAdmin()           // editing location is owner-only
  const has = lat != null
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState({ latStr: '', lngStr: '', place: '' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  const start  = () => { setError(null); setEditing(true) }
  const cancel = () => { setEditing(false); setError(null) }

  const commit = async () => {
    const parsed = parseLatLng(draft.latStr, draft.lngStr)
    if (!parsed) { setError('Enter valid lat, lng'); return }
    setSaving(true)
    try {
      await setMediaLocation(path, {
        latitude: parsed.lat,
        longitude: parsed.lng,
        place_name: draft.place || null,
      })
      setEditing(false)
      setError(null)
      onLocated?.()
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) return null              // family see the map/GPS value, no editor

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <LocationPicker initialLat={lat} initialLng={lng} disabled={saving} onChange={setDraft} />
        <div className="flex items-center gap-2">
          <button type="button" onClick={commit} disabled={saving}
                  className="rounded bg-white/15 px-2 py-0.5 text-[11px] text-white transition-colors hover:bg-white/25 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={cancel} disabled={saving}
                  className="text-[11px] text-white/45 transition-colors hover:text-white/70 disabled:opacity-50">
            Cancel
          </button>
        </div>
        <p className="text-[10px] leading-snug text-white/30">Writes to the graph, sidecar, and the file&apos;s EXIF GPS.</p>
        {error && <p className="text-[11px] text-rose-400/80">{error}</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={start}
      className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/40 transition-colors hover:text-white/75"
    >
      <Pencil size={11} />
      {has ? (source === 'manual' ? 'Edit location' : 'Correct location') : 'Set location'}
    </button>
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
