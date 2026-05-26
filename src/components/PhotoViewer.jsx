import { useState, useEffect, useCallback, useRef } from 'react'
import { searchPeople } from '../lib/api'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix leaflet's broken default marker icon URLs under bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function MiniMap({ lat, lng }) {
  return (
    <div className="mt-2 rounded overflow-hidden" style={{ height: 140 }}>
      <MapContainer
        key={`${lat},${lng}`}
        center={[lat, lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  )
}

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
      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-2 leading-snug">{title}</p>
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

function UnidentifiedFaces({ faces, photoPath, onAssigned, onHover }) {
  const [activeFace, setActiveFace]   = useState(null)
  const [query, setQuery]             = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [saving, setSaving]           = useState(false)
  const [clusterBanner, setClusterBanner] = useState(null) // {cluster_id, size, person}

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      const results = await searchPeople(query).catch(() => [])
      setSuggestions(results)
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  async function assign(person) {
    setSaving(true)
    const face = activeFace
    try {
      await fetch(`/api/people/${person.id}/faces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_path: photoPath,
          face_index: face.face_index,
          crop_path:  face.crop_path,
        }),
      })
      setActiveFace(null)
      setQuery('')
      onAssigned()

      // Check if this face belongs to a cluster
      const res = await fetch(
        `/api/faces/clusters/lookup?photo_path=${encodeURIComponent(photoPath)}&face_index=${face.face_index}`
      )
      const data = await res.json()
      if (data.cluster_id && !data.already_assigned && data.size > 1) {
        setClusterBanner({ cluster_id: data.cluster_id, size: data.size, person })
      }
    } finally {
      setSaving(false)
    }
  }

  async function assignCluster() {
    if (!clusterBanner) return
    await fetch(`/api/faces/clusters/${clusterBanner.cluster_id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: clusterBanner.person.id }),
    })
    setClusterBanner(null)
  }

  if (!faces.length) return null

  return (
    <Section title="Unidentified">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {faces.map(f => (
          <button
            key={f.face_index}
            onClick={() => { setActiveFace(f === activeFace ? null : f); setQuery('') }}
            onMouseEnter={() => onHover(f.bbox ? { bbox: f.bbox, name: '?' } : null)}
            onMouseLeave={() => onHover(null)}
            className={`w-8 h-8 rounded overflow-hidden border-2 transition-colors ${activeFace?.face_index === f.face_index ? 'border-white/60' : 'border-transparent hover:border-white/30'}`}
          >
            <img src={f.crop_url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {activeFace && (
        <div className="mt-1">
          <a
            href={`/manage/faces/similar?photo_path=${encodeURIComponent(photoPath)}&face_index=${activeFace.face_index}&seed_crop=${encodeURIComponent(activeFace.crop_url || '')}`}
            target="_blank" rel="noreferrer"
            className="block mb-1.5 text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors"
          >
            Find similar faces →
          </a>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search person…"
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder-white/25 outline-none focus:border-white/25"
          />
          {suggestions.length > 0 && (
            <div className="mt-1 bg-[#1a1a1a] border border-white/10 rounded overflow-hidden">
              {suggestions.map(p => (
                <button
                  key={p.id}
                  disabled={saving}
                  onClick={() => assign(p)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-white/70 hover:bg-white/5 hover:text-white text-left"
                >
                  {p.avatar
                    ? <img src={`/api/media/${p.avatar}`} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                    : <div className="w-4 h-4 rounded-full bg-white/10 shrink-0" />
                  }
                  <span>{p.known_as && <span className="text-white/35 mr-1">({p.known_as})</span>}{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {clusterBanner && (
        <div className="mt-2 p-2 bg-blue-950/60 border border-blue-500/30 rounded text-[11px]">
          <p className="text-blue-200/80 mb-1.5">
            This face is in a cluster of <span className="text-white font-medium">{clusterBanner.size.toLocaleString()}</span> photos.
            Assign <span className="text-white font-medium">{clusterBanner.person.known_as || clusterBanner.person.name}</span> to all of them?
          </p>
          <div className="flex gap-2">
            <button
              onClick={assignCluster}
              className="px-2 py-1 bg-blue-600/70 hover:bg-blue-600 text-white/90 rounded text-[10px] font-medium transition-colors"
            >
              Assign all {clusterBanner.size.toLocaleString()}
            </button>
            <button
              onClick={() => setClusterBanner(null)}
              className="px-2 py-1 text-white/30 hover:text-white/60 text-[10px] transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </Section>
  )
}

export function PhotoViewer({ photos, initialIndex, onClose, onNeedMore, onNavigate }) {
  const [index, setIndex]         = useState(initialIndex)
  const [detail, setDetail]       = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [hoveredFace, setHoveredFace]   = useState(null)
  const [assigningFace, setAssigningFace] = useState(null)  // unidentified face object
  const imgRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const photo    = photos[index]
  const touchX   = useRef(null)

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
    <div className="fixed inset-0 z-[2000] flex flex-col md:flex-row bg-black/96 overflow-y-auto md:overflow-hidden">
      {/* Image area */}
      <div
        className="relative flex items-center justify-center min-w-0 h-screen shrink-0 md:h-auto md:flex-1 md:overflow-hidden"
        onTouchStart={e => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (Math.abs(dx) < 40) return
          go(dx < 0 ? 1 : -1)
        }}
      >
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
            ref={imgRef}
            key={photo.url}
            src={photo.url}
            alt={photo.filename}
            className="max-h-full max-w-full object-contain block"
          />
        )}

        {hoveredFace?.bbox && imgRef.current && (() => {
          const img = imgRef.current
          const [x1, y1, x2, y2] = hoveredFace.bbox
          const sx = img.clientWidth  / img.naturalWidth
          const sy = img.clientHeight / img.naturalHeight
          return (
            <div
              className="absolute pointer-events-none border-2 border-white/80 rounded"
              style={{
                left:   img.offsetLeft + x1 * sx,
                top:    img.offsetTop  + y1 * sy,
                width:  (x2 - x1) * sx,
                height: (y2 - y1) * sy,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              }}
            >
              <span className="absolute -bottom-5 left-0 text-[10px] text-white/80 whitespace-nowrap bg-black/60 px-1 rounded">
                {hoveredFace.name}
              </span>
            </div>
          )
        })()}

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
      <div className="shrink-0 border-t border-white/[0.07] md:border-t-0 md:border-l md:w-72 md:overflow-y-auto p-4">
        <p className="text-[12px] text-white/55 font-medium break-all leading-snug mb-3">
          {photo.filename}
        </p>

        {detailLoading && (
          <p className="text-[11px] text-white/20 mt-2">Loading…</p>
        )}

        {detail && (
          <>
            {detail.people?.length > 0 && (
              <Section title="People">
                <div className="flex flex-col gap-1.5">
                  {detail.people.map(p => (
                    <a
                      key={p.id}
                      href={`/manage/people/${p.id}`}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      onMouseEnter={() => setHoveredFace(p.bbox ? { bbox: p.bbox, name: p.known_as || p.name } : null)}
                      onMouseLeave={() => setHoveredFace(null)}
                    >
                      {p.crop_url
                        ? <img src={p.crop_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                        : p.avatar
                          ? <img src={`/api/media/${p.avatar}`} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                          : <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
                      }
                      <span className="text-[11px] text-white/70">{p.known_as || p.name}</span>
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {(detail.people?.length > 0 || detail.unidentified?.length > 0) && (
              <UnidentifiedFaces
                faces={detail.unidentified || []}
                photoPath={detail.path}
                onAssigned={() => {
                  setDetail(null)
                  fetch(`/api/gallery/detail?path=${encodeURIComponent(photo.path)}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d) setDetail(d) })
                }}
                onHover={setHoveredFace}
              />
            )}

            {!detail.people?.length && detail.unidentified?.length > 0 && null /* already rendered above */}
            {!detail.people?.length && !detail.unidentified?.length && detail.face_count > 0 && (
              <Section title="People">
                <p className="text-[11px] text-white/30">{detail.face_count} face{detail.face_count !== 1 ? 's' : ''} detected — none identified</p>
              </Section>
            )}

            {detail.objects?.length > 0 && (
              <Section title="Detected">
                <div className="flex flex-wrap gap-1.5">
                  {detail.objects.map(o => (
                    <span key={o.label} className="text-[10px] text-white/40 bg-white/5 rounded px-1.5 py-0.5">
                      {o.label}{o.count > 1 ? ` ×${o.count}` : ''}
                    </span>
                  ))}
                </div>
              </Section>
            )}

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
                  <Row
                    label="City"
                    value={`${detail.location.city}${detail.location.state ? `, ${detail.location.state}` : ''}`}
                  />
                )}
                {detail.location.latitude != null && (
                  <>
                    <Row
                      label="GPS"
                      value={`${detail.location.latitude.toFixed(5)}, ${detail.location.longitude.toFixed(5)}`}
                    />
                    <MiniMap lat={detail.location.latitude} lng={detail.location.longitude} />
                  </>
                )}
              </Section>
            )}

            {cameraLabel && (
              <Section title={`Camera — ${cameraLabel}`}>
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
