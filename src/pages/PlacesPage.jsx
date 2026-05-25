import { useState, useEffect } from 'react'
import { PhotoMap } from '../components/PhotoMap'

export function PlacesPage() {
  const [points, setPoints]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/places/points')
      .then(r => r.json())
      .then(d => { setPoints(d.points || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <PhotoMap
      points={points}
      loading={loading}
      height="calc(100vh - 3rem)"
      badge={points.length ? `${points.length.toLocaleString()} photos with GPS · zoom in to explore` : null}
    />
  )
}
