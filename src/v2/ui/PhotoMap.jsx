import { useCallback, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { ClusterLayer } from '../../components/PhotoMap'
import { PhotoViewer } from '../../components/PhotoViewer'
import { isVideo, mediaUrl, thumbUrl } from '../../lib/media'
import { C } from './tokens'

/**
 * Every photograph that knows where it was taken.
 *
 * The v2 counterpart of the v1 map. The clustering is the same code — that
 * part is Leaflet and Supercluster with no styling to speak of — and what
 * changes is everything around it: a light basemap instead of the dark canvas,
 * and a panel that belongs on a white page.
 *
 * The full-screen viewer stays dark. A photograph shown at full size wants a
 * dark surround whatever the rest of the app is doing.
 */

const PER_PAGE = 30

function PhotoPanel({ paths, onOpenViewer, onClose }) {
  const [page, setPage] = useState(0)
  const total = paths.length
  const pages = Math.ceil(total / PER_PAGE)
  const visible = paths.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  return (
    <div
      style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1500, width: 'min(640px, 92vw)',
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14,
        boxShadow: '0 8px 40px rgba(0,0,0,.2)', overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontSize: 12.5, color: C.muted }}>
          {total.toLocaleString()} photo{total === 1 ? '' : 's'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {pages > 1 && (
            <>
              <button
                type="button"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Previous page"
                style={pager(page === 0)}
              >
                ‹
              </button>
              <span style={{ fontSize: 11.5, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                {page + 1} / {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
                disabled={page >= pages - 1}
                aria-label="Next page"
                style={pager(page >= pages - 1)}
              >
                ›
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ ...pager(false), marginLeft: 4 }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ padding: 8, overflowY: 'auto', maxHeight: '35vh' }}>
        <div style={{
          display: 'grid', gap: 6,
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
        }}>
          {visible.map((path, i) => (
            <button
              key={path}
              type="button"
              onClick={() => onOpenViewer(paths, page * PER_PAGE + i)}
              style={{
                aspectRatio: '1 / 1', padding: 0, border: 0, borderRadius: 6,
                overflow: 'hidden', background: C.hover, cursor: 'pointer',
              }}
            >
              <img
                src={thumbUrl(path)}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { e.target.src = mediaUrl(path) }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PhotoMap({ points, loading, height, badge }) {
  const [panel, setPanel] = useState(null)
  const [viewer, setViewer] = useState(null)

  const selectPhoto = useCallback(path => setPanel({ paths: [path] }), [])
  const selectCluster = useCallback(paths => setPanel({ paths }), [])
  const openViewer = useCallback((paths, index) => {
    setViewer({
      photos: paths.map(p => ({ path: p, url: mediaUrl(p), is_video: isVideo(p) })),
      index,
    })
  }, [])

  return (
    <div style={{ position: 'relative', height, borderRadius: 12, overflow: 'hidden' }}>
      {loading && (
        <div style={overlay}>Loading GPS data…</div>
      )}
      {!loading && points.length === 0 && (
        <div style={overlay}>No photographs with GPS yet.</div>
      )}
      {!loading && points.length > 0 && badge && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, pointerEvents: 'none',
          background: 'rgba(255,255,255,.92)', border: `1px solid ${C.border}`,
          borderRadius: 999, padding: '4px 12px', fontSize: 11.5, color: C.muted,
        }}>
          {badge}
        </div>
      )}

      <MapContainer
        center={[42.5, -71.2]}
        zoom={7}
        style={{ width: '100%', height: '100%' }}
        zoomControl
      >
        {/* Esri's light canvas rather than the dark one v1 uses, and keyless
            either way — CARTO started demanding an API key and stamped "API
            KEY REQUIRED" across every tile while still returning 200, so
            nothing errored and the map just quietly became a watermark. */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
          maxNativeZoom={16}
          maxZoom={19}
        />
        {points.length > 0 && (
          <ClusterLayer
            points={points}
            onSelectPhoto={selectPhoto}
            onSelectCluster={selectCluster}
          />
        )}
      </MapContainer>

      {panel && (
        <PhotoPanel
          paths={panel.paths}
          onOpenViewer={openViewer}
          onClose={() => setPanel(null)}
        />
      )}

      {viewer && (
        <PhotoViewer
          photos={viewer.photos}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
          onNeedMore={() => {}}
          onNavigate={() => {}}
        />
      )}
    </div>
  )
}

const overlay = {
  position: 'absolute', inset: 0, zIndex: 10,
  display: 'grid', placeItems: 'center',
  color: C.muted, fontSize: 13.5, pointerEvents: 'none',
  background: 'rgba(255,255,255,.7)',
}

const pager = disabled => ({
  border: 0, background: 'transparent', cursor: disabled ? 'default' : 'pointer',
  color: C.muted, opacity: disabled ? 0.3 : 1,
  fontSize: 14, lineHeight: 1, padding: '2px 6px',
})
