import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { PhotoMap } from '../components/PhotoMap'

export function PersonTravel() {
  const { person } = useOutletContext()
  const [points, setPoints]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPoints([])
    setLoading(true)
    fetch(`/api/people/${person.id}/travel/points`)
      .then(r => r.json())
      .then(d => { setPoints(d.points || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [person.id])

  return (
    <PhotoMap
      points={points}
      loading={loading}
      height="calc(100vh - 16rem)"
      badge={points.length ? `${points.length.toLocaleString()} photos with GPS` : null}
    />
  )
}
