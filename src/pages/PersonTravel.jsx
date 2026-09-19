import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { PhotoMap } from '../ui/PhotoMap'
import { C } from '../ui/tokens'

/**
 * Everywhere somebody has been photographed.
 *
 * The same map as Places, asked a narrower question. Which is the whole appeal
 * of it on a person's page: the archive knows where its photographs were
 * taken, so it knows where the people in them were — the summer in Maine, the
 * year of hospital visits, the one trip abroad.
 */
export function PersonTravel() {
  const { person } = useOutletContext()
  // Stamped with whose points these are, so switching people cannot leave the
  // last person's map on screen while the next one loads.
  const [state, setState] = useState({ forId: null, points: [] })

  useEffect(() => {
    let alive = true
    fetch(`/api/people/${person.id}/travel/points`)
      .then(r => (r.ok ? r.json() : { points: [] }))
      .then(d => { if (alive) setState({ forId: person.id, points: d.points || [] }) })
      .catch(() => { if (alive) setState({ forId: person.id, points: [] }) })
    return () => { alive = false }
  }, [person.id])

  const ready = state.forId === person.id
  const points = ready ? state.points : []
  const loading = !ready

  const first = person.known_as || (person.name || '').split(' ')[0]

  return (
    <div>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px', maxWidth: '70ch' }}>
        {points.length > 0
          ? `${points.length.toLocaleString()} photographs of ${first} know where they were taken.`
          : `No photographs of ${first} carry a location yet.`}
      </p>

      <PhotoMap
        points={points}
        loading={loading}
        height="calc(100vh - 300px)"
        badge={points.length ? 'Zoom in to explore' : null}
      />
    </div>
  )
}
