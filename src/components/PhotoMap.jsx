import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import Supercluster from 'supercluster'
import 'leaflet/dist/leaflet.css'
import { PhotoViewer } from './PhotoViewer'
import { isVideo, mediaUrl } from '../lib/media'
import { useEscToClose } from '../lib/hooks'

function thumbUrl(path) {
  return `/api/media/thumb/${path.replace(/^archive\//, '')}`
}

// ── Cluster layer ──────────────────────────────────────────────────────────────

function ClusterLayer({ points, onSelectPhoto, onSelectCluster }) {
  const map        = useMap()
  const layerRef   = useRef(L.layerGroup())
  const indexRef   = useRef(new Supercluster({ radius: 60, maxZoom: 17, minPoints: 2 }))
  const indexReady = useRef(false)

  useEffect(() => {
    if (!points.length) return
    const features = points.map(([lat, lng, path]) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { path },
    }))
    indexRef.current.load(features)
    indexReady.current = true
    update()
  }, [points])

  const update = useCallback(() => {
    if (!indexReady.current) return
    const INDEX  = indexRef.current
    const bounds = map.getBounds()
    const zoom   = Math.floor(map.getZoom())
    const bbox   = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
    const clusters = INDEX.getClusters(bbox, zoom)

    layerRef.current.clearLayers()

    clusters.forEach(feature => {
      const [lng, lat] = feature.geometry.coordinates
      const { cluster, point_count, cluster_id, path } = feature.properties

      if (cluster) {
        const size = point_count > 5000 ? 56 : point_count > 500 ? 48 : point_count > 50 ? 40 : 32
        const fs   = size > 48 ? 13 : size > 40 ? 12 : 11
        const label = point_count > 9999 ? `${(point_count/1000).toFixed(0)}k`
                    : point_count > 999  ? `${(point_count/1000).toFixed(1)}k`
                    : String(point_count)
        const icon = L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;background:rgba(59,130,246,0.85);border:2px solid rgba(147,197,253,0.5);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:${fs}px;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,0.5);">${label}</div>`,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size/2, size/2],
        })
        const marker = L.marker([lat, lng], { icon })
        marker.on('click', () => {
          const expansionZoom = Math.min(INDEX.getClusterExpansionZoom(cluster_id), 17)
          if (zoom >= 13) {
            const leaves = INDEX.getLeaves(cluster_id, Infinity)
            onSelectCluster(leaves.map(f => f.properties.path), [lat, lng])
          } else {
            map.flyTo([lat, lng], expansionZoom, { duration: 0.5 })
          }
        })
        layerRef.current.addLayer(marker)
      } else {
        const icon = L.divIcon({
          html: `<div style="width:10px;height:10px;background:rgba(96,165,250,0.9);border:2px solid rgba(147,197,253,0.7);border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
          className: '',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        })
        const marker = L.marker([lat, lng], { icon })
        marker.on('click', () => onSelectPhoto(path, [lat, lng]))
        layerRef.current.addLayer(marker)
      }
    })
  }, [map, onSelectPhoto, onSelectCluster])

  useMapEvents({ moveend: update, zoomend: update })

  useEffect(() => {
    layerRef.current.addTo(map)
    return () => layerRef.current.remove()
  }, [map])

  return null
}

// ── Photo panel ────────────────────────────────────────────────────────────────

function PhotoPanel({ paths, onOpenViewer, onClose }) {
  useEscToClose(onClose)
  const [page, setPage] = useState(0)
  const PER_PAGE = 30
  const total    = paths.length
  const visible  = paths.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const pages    = Math.ceil(total / PER_PAGE)

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1500] bg-[#111]/95 backdrop-blur border border-white/10 rounded-xl shadow-2xl overflow-hidden"
      style={{ width: 'min(640px, 92vw)' }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
        <span className="text-[12px] text-white/50">{total.toLocaleString()} photo{total !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-2">
          {pages > 1 && (
            <>
              <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}
                className="text-[11px] text-white/30 hover:text-white/70 disabled:opacity-20 px-1.5 py-0.5">‹</button>
              <span className="text-[11px] text-white/30">{page+1} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages-1, p+1))} disabled={page >= pages-1}
                className="text-[11px] text-white/30 hover:text-white/70 disabled:opacity-20 px-1.5 py-0.5">›</button>
            </>
          )}
          <button onClick={onClose} className="text-white/30 hover:text-white/70 leading-none ml-1 px-1">✕</button>
        </div>
      </div>
      <div className="p-2 overflow-y-auto" style={{ maxHeight: '35vh' }}>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
          {visible.map((path, i) => (
            <button
              key={path}
              onClick={() => onOpenViewer(paths, page * PER_PAGE + i)}
              className="aspect-square rounded overflow-hidden hover:opacity-80 transition-opacity bg-white/5"
            >
              <img
                src={thumbUrl(path)}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
                onError={e => { e.target.src = mediaUrl(path) }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Reusable map ───────────────────────────────────────────────────────────────

export function PhotoMap({ points, loading, height, badge }) {
  const [panel, setPanel]   = useState(null)
  const [viewer, setViewer] = useState(null)

  const handleSelectPhoto = useCallback((path, latlng) => {
    setPanel({ paths: [path], latlng })
  }, [])

  const handleSelectCluster = useCallback((paths, latlng) => {
    setPanel({ paths, latlng })
  }, [])

  const handleOpenViewer = useCallback((paths, index) => {
    setViewer({
      photos: paths.map(p => ({ path: p, url: mediaUrl(p), is_video: isVideo(p) })),
      index,
    })
  }, [])

  return (
    <div className="relative" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-white/40 text-sm pointer-events-none">
          Loading GPS data…
        </div>
      )}
      {!loading && points.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-white/30 text-sm pointer-events-none">
          No GPS photos found.
        </div>
      )}
      {!loading && points.length > 0 && badge && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 backdrop-blur border border-white/10 rounded-full px-3 py-1 text-[11px] text-white/40 pointer-events-none">
          {badge}
        </div>
      )}

      <MapContainer
        center={[42.5, -71.2]}
        zoom={7}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />
        {points.length > 0 && (
          <ClusterLayer
            points={points}
            onSelectPhoto={handleSelectPhoto}
            onSelectCluster={handleSelectCluster}
          />
        )}
      </MapContainer>

      {panel && (
        <PhotoPanel
          paths={panel.paths}
          onOpenViewer={handleOpenViewer}
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
