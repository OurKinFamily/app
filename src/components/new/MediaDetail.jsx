import { useState, useEffect } from 'react'
import { mediaUrl } from '../../lib/media'
import { DetailSection } from './DetailSection'
import { Field } from './Field'
import { Tag } from './Tag'
import { Swatch } from './Swatch'
import { MiniMap } from './MiniMap'
import { Thumb } from './Thumb'
import { EntityChip } from './EntityChip'
import { Button } from './Button'

function formatDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatSize(bytes) {
  if (bytes == null) return null
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${Math.round(bytes / 1e3)} KB`
}

const CONF_TONE = { high: 'green', medium: 'amber', low: 'red' }
const FACE_PREVIEW = 6

// Mount one per item (key by item.path) so state resets cleanly on navigation.
// ctx (from MediaLightbox): { setHighlight, setFaces, setBumpDetail, openAssign, ... }
export function MediaDetail({ item, ctx }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAllFaces, setShowAllFaces] = useState(false)

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/gallery/detail?path=${encodeURIComponent(item.path)}`, { cache: 'no-store' })
      if (res.ok) setDetail(await res.json())
    } catch { /* ignore network errors */ }
  }

  useEffect(() => {
    if (!item?.path) return
    let alive = true
    fetch(`/api/gallery/detail?path=${encodeURIComponent(item.path)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d) setDetail(d) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [item?.path])

  // Push the face list up so the lightbox can draw interactive bboxes over the image.
  useEffect(() => {
    if (!ctx?.setFaces) return
    if (!detail) { ctx.setFaces([]); return }
    const list = [
      ...(detail.people || []).filter(p => p.bbox).map(p => ({
        bbox: p.bbox, label: p.known_as || p.name, identified: true, person: p,
      })),
      ...(detail.unidentified || []).filter(f => f.bbox).map(f => ({
        bbox: f.bbox, identified: false, face: f,
      })),
    ]
    ctx.setFaces(list)
  }, [detail, ctx])

  // Register a reloader so the lightbox can refresh us after an assign.
  useEffect(() => { ctx?.setBumpDetail?.(fetchDetail) }, [ctx]) // eslint-disable-line react-hooks/exhaustive-deps

  const cameraLabel = detail ? [detail.camera?.make, detail.camera?.model].filter(Boolean).join(' ') : ''
  const orientation = detail?.media?.orientation

  return (
    <div>
      <p className="mb-3 break-all text-[12px] font-medium leading-snug text-white/55">{item.filename || item.path}</p>
      {loading && <p className="text-[11px] text-white/20">Loading…</p>}
      {detail && (
        <>
          {detail.people?.length > 0 && (
            <DetailSection title="People">
              <div className="flex flex-wrap gap-1.5">
                {detail.people.map(p => (
                  <span
                    key={p.id}
                    onMouseEnter={() => p.bbox && ctx?.setHighlight?.({ bbox: p.bbox, label: p.known_as || p.name })}
                    onMouseLeave={() => ctx?.setHighlight?.(null)}
                  >
                    <EntityChip
                      to={`/manage/people/${p.id}`}
                      avatar={p.crop_url || (p.avatar ? mediaUrl(p.avatar) : null)}
                      text={p.known_as || p.name}
                    />
                  </span>
                ))}
              </div>
            </DetailSection>
          )}

          {detail.unidentified?.length > 0 && (() => {
            const all = detail.unidentified
            const visible = showAllFaces ? all : all.slice(0, FACE_PREVIEW)
            const hidden = all.length - visible.length
            return (
              <DetailSection title={`Unidentified · ${all.length}`}>
                <div className="flex flex-wrap gap-1.5">
                  {visible.map(f => (
                    <Thumb
                      key={f.face_index}
                      src={f.crop_url}
                      onClick={e => ctx?.openAssign?.(f, e.clientX, e.clientY)}
                      className="h-10 w-10"
                    />
                  ))}
                </div>
                {hidden > 0 && (
                  <Button variant="secondary" size="sm" className="mt-2" onClick={() => setShowAllFaces(true)}>
                    Show {hidden} more
                  </Button>
                )}
                {showAllFaces && all.length > FACE_PREVIEW && (
                  <Button variant="secondary" size="sm" className="ml-2 mt-2" onClick={() => setShowAllFaces(false)}>
                    Show less
                  </Button>
                )}
              </DetailSection>
            )
          })()}

          {detail.objects?.length > 0 && (
            <DetailSection title="Detected">
              <div className="flex flex-wrap gap-1.5">
                {detail.objects.map(o => <Tag key={o.label}>{o.label}{o.count > 1 ? ` ×${o.count}` : ''}</Tag>)}
              </div>
            </DetailSection>
          )}

          {detail.timestamp?.value && (
            <DetailSection title="Date">
              <p className="mb-2 text-[13px] text-white/80">{formatDate(detail.timestamp.value)}</p>
              <Field label="Source" value={detail.timestamp.source} />
              <Field
                label="Confidence"
                value={detail.timestamp.confidence
                  ? <Tag tone={CONF_TONE[detail.timestamp.confidence] || 'default'} className="uppercase">{detail.timestamp.confidence}</Tag>
                  : null}
              />
            </DetailSection>
          )}

          {detail.location && (detail.location.latitude != null || detail.location.city) && (
            <DetailSection title="Location">
              {detail.location.city && (detail.location.city_confidence ?? 0) >= 0.5 && (
                <Field label="City" value={`${detail.location.city}${detail.location.state ? `, ${detail.location.state}` : ''}`} />
              )}
              {detail.location.latitude != null && (
                <>
                  <Field label="GPS" value={`${detail.location.latitude.toFixed(5)}, ${detail.location.longitude.toFixed(5)}`} />
                  <div className="mt-2"><MiniMap lat={detail.location.latitude} lng={detail.location.longitude} /></div>
                </>
              )}
            </DetailSection>
          )}

          {cameraLabel && (
            <DetailSection title={`Camera — ${cameraLabel}`}>
              {detail.camera?.lens && detail.camera.lens !== cameraLabel && <Field label="Lens" value={detail.camera.lens} />}
            </DetailSection>
          )}

          {detail.settings && (
            <DetailSection title="Exposure">
              <Field label="ISO" value={detail.settings.iso} />
              <Field label="Aperture" value={detail.settings.aperture != null ? `f/${detail.settings.aperture}` : null} />
              <Field label="Shutter" value={detail.settings.shutterSpeed} />
              <Field label="Focal length" value={detail.settings.focalLength} />
              <Field label="Flash" value={detail.settings.flash} />
            </DetailSection>
          )}

          <DetailSection title="File">
            <Field label="Size" value={formatSize(detail.file?.size)} />
            {detail.media?.width && <Field label="Dimensions" value={`${detail.media.width} × ${detail.media.height}`} />}
            <Field label="Megapixels" value={detail.media?.megapixels ? `${detail.media.megapixels} MP` : null} />
            <Field label="Format" value={detail.media?.format} />
            <Field label="Orientation" value={orientation && !/unknown/i.test(orientation) ? orientation : null} />
          </DetailSection>

          {(detail.media?.dominantColor || detail.media?.meanColor || detail.media?.salientColor) && (
            <DetailSection title="Colors">
              <Swatch color={detail.media.dominantColor} label="Dominant" />
              <Swatch color={detail.media.meanColor} label="Mean" />
              <Swatch color={detail.media.salientColor} label="Salient" />
            </DetailSection>
          )}

          {detail.processing?.processor && (
            <DetailSection title="Processing">
              <Field label="Processor" value={detail.processing.processor} />
              <Field label="Extracted" value={formatDate(detail.processing.extractedAt)} />
            </DetailSection>
          )}
        </>
      )}
    </div>
  )
}
