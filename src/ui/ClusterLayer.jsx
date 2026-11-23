import { useCallback, useEffect, useRef } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import Supercluster from 'supercluster'

// ── Cluster layer ──────────────────────────────────────────────────────────────

// Leaflet and Supercluster and no styling to speak of, so the theme it is
// dropped into makes no difference to it. Lived in components/PhotoMap.jsx
// until 2026-11-22; the rest of that file was a superseded copy of this
// directory's PhotoMap and went with it.
export function ClusterLayer({ points, onSelectPhoto, onSelectCluster }) {
  const map        = useMap()
  const layerRef   = useRef(L.layerGroup())
  const indexRef   = useRef(new Supercluster({ radius: 60, maxZoom: 17, minPoints: 2 }))
  const indexReady = useRef(false)

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


  // Declared above the effect that calls it on purpose: `update` is a const,
  // so calling it from an effect declared earlier only works because effects
  // run after the body. Reading in source order should not require knowing
  // that.
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
  }, [points, update])


  useMapEvents({ moveend: update, zoomend: update })

  useEffect(() => {
    // Captured now rather than read in the cleanup: by the time cleanup runs
    // the ref may point at a different layer, and we would detach the wrong
    // one and leak this one onto the map.
    const layer = layerRef.current
    layer.addTo(map)
    return () => layer.remove()
  }, [map])

  return null
}
