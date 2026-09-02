import { useEffect, useState } from 'react'
import { PhotoMap } from '../ui/PhotoMap'
import { C } from '../ui/tokens'

/**
 * Places — the archive as a map.
 *
 * A straight port of the v1 page onto the light skin. The map is the content,
 * so the heading stays out of its way and the map takes what is left of the
 * window.
 */
export function V2PlacesPage() {
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/places/points')
      .then(r => (r.ok ? r.json() : { points: [] }))
      .then(d => setPoints(d.points || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 12px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Places</h1>
        {points.length > 0 && (
          <span style={{ fontSize: 13, color: C.muted }}>
            {points.length.toLocaleString()}
          </span>
        )}
      </div>

      <PhotoMap
        points={points}
        loading={loading}
        height="calc(100vh - 150px)"
        badge={points.length ? 'Zoom in to explore' : null}
      />
    </div>
  )
}
