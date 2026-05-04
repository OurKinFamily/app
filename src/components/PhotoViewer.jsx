import { useState, useEffect, useCallback } from 'react'

function formatDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatSize(bytes) {
  if (bytes == null) return null
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${Math.round(bytes / 1e3)} KB`
}

function Section({ title, children }) {
  return (
    <div className="border-t border-white/[0.07] pt-3 pb-1 mt-3 first:border-0 first:mt-0 first:pt-0">
      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="flex justify-between gap-3 mb-1.5">
      <span className="text-[11px] text-white/30 shrink-0">{label}</span>
      <span className="text-[11px] text-white/65 text-right break-all">{String(value)}</span>
    </div>
  )
}

function Swatch({ color, label }) {
  if (!color) return null
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <div className="w-3.5 h-3.5 rounded shrink-0 border border-white/10" style={{ background: color }} />
      <span className="text-[11px] text-white/30">{label}</span>
      <span className="text-[11px] text-white/45 ml-auto font-mono">{color}</span>
    </div>
  )
}

export function PhotoViewer({ photos, initialIndex, onClose, onNeedMore, onNavigate }) {
  const [index, setIndex]       = useState(initialIndex)
  const [detail, setDetail]     = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const photo = photos[index]

  const go = useCallback((delta) => {
    setIndex(i => {
      const next = i + delta
      if (next < 0 || next >= photos.length) return i
      if (next >= photos.length - 8) onNeedMore?.()
      return next
    })
  }, [photos.length, onNeedMore])

  useEffect(() => {
    if (photos[index]) onNavigate?.(photos[index])
  }, [index])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go, onClose])

  useEffect(() => {
    if (!photo) return
    setDetail(null)
    setDetailLoading(true)
    fetch(`/api/gallery/detail?path=${encodeURIComponent(photo.path)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDetail(d) })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [photo?.path])

  if (!photo) return null

  const canPrev = index > 0
  const canNext = index < photos.length - 1

  const cameraLabel = [detail?.camera?.make, detail?.camera?.model].filter(Boolean).join(' ')
  const lensLabel   = detail?.camera?.lens
  const skipLens    = lensLabel === cameraLabel || !lensLabel

  return (
    <div className="fixed inset-0 z-50 flex bg-black/96">
      {/* Image area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden min-w-0">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-white/35 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors text-xl leading-none"
        >
          ×
        </button>

        {canPrev && (
          <button
            onClick={() => go(-1)}
            className="absolute left-3 z-10 w-10 h-10 flex items-center justify-center text-white/35 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors text-2xl leading-none"
          >
            ‹
          </button>
        )}

        {photo.is_video ? (
          <video
            key={photo.url}
            src={photo.url}
            controls
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <img
            key={photo.url}
            src={photo.url}
            alt={photo.filename}
            className="max-h-full max-w-full object-contain"
          />
        )}

        {canNext && (
          <button
            onClick={() => go(1)}
            className="absolute right-3 z-10 w-10 h-10 flex items-center justify-center text-white/35 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors text-2xl leading-none"
          >
            ›
          </button>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-white/20 tabular-nums">
          {index + 1} / {photos.length}
        </div>
      </div>

      {/* Detail sidebar */}
      <div className="w-72 shrink-0 border-l border-white/[0.07] overflow-y-auto p-4">
        <p className="text-[12px] text-white/55 font-medium break-all leading-snug mb-3">
          {photo.filename}
        </p>

        {detailLoading && (
          <p className="text-[11px] text-white/20 mt-2">Loading…</p>
        )}

        {detail && (
          <>
            {detail.timestamp?.value && (
              <Section title="Date">
                <p className="text-[13px] text-white/80 mb-2">{formatDate(detail.timestamp.value)}</p>
                <Row label="Source"     value={detail.timestamp.source} />
                <Row label="Confidence" value={detail.timestamp.confidence} />
              </Section>
            )}

            {detail.location && (
              <Section title="Location">
                {detail.location.city && (detail.location.city_confidence ?? 0) >= 0.5 && (
                  <p className="text-[13px] text-white/80 mb-2">
                    {detail.location.city}{detail.location.state ? `, ${detail.location.state}` : ''}
                  </p>
                )}
                {detail.location.landmark && (
                  <Row
                    label={detail.location.landmark_category || 'Landmark'}
                    value={`${detail.location.landmark}${detail.location.landmark_distance_m ? ` (${Math.round(detail.location.landmark_distance_m)}m)` : ''}`}
                  />
                )}
                {detail.location.latitude != null && (
                  <Row
                    label="GPS"
                    value={`${detail.location.latitude.toFixed(5)}, ${detail.location.longitude.toFixed(5)}`}
                  />
                )}
              </Section>
            )}

            {cameraLabel && (
              <Section title="Camera">
                <p className="text-[13px] text-white/80 mb-2">{cameraLabel}</p>
                {!skipLens && <Row label="Lens" value={lensLabel} />}
              </Section>
            )}

            {detail.settings && (
              <Section title="Exposure">
                <Row label="ISO"          value={detail.settings.iso} />
                <Row label="Aperture"     value={detail.settings.aperture != null ? `f/${detail.settings.aperture}` : null} />
                <Row label="Shutter"      value={detail.settings.shutterSpeed} />
                <Row label="Focal length" value={detail.settings.focalLength} />
                <Row label="Flash"        value={detail.settings.flash} />
              </Section>
            )}

            <Section title="File">
              <Row label="Size"       value={formatSize(detail.file?.size)} />
              {detail.media?.width && (
                <Row label="Dimensions" value={`${detail.media.width} × ${detail.media.height}`} />
              )}
              <Row label="Megapixels" value={detail.media?.megapixels ? `${detail.media.megapixels} MP` : null} />
              <Row label="Format"     value={detail.media?.format} />
              <Row label="Orientation" value={detail.media?.orientation !== 'unknown' && detail.media?.orientation !== 'Unknown' ? detail.media?.orientation : null} />
            </Section>

            {(detail.media?.dominantColor || detail.media?.meanColor || detail.media?.salientColor) && (
              <Section title="Colors">
                <Swatch color={detail.media.dominantColor} label="Dominant" />
                <Swatch color={detail.media.meanColor}    label="Mean" />
                <Swatch color={detail.media.salientColor} label="Salient" />
              </Section>
            )}

            {detail.processing?.processor && (
              <Section title="Processing">
                <Row label="Processor"  value={detail.processing.processor} />
                <Row label="Extracted"  value={formatDate(detail.processing.extractedAt)} />
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
