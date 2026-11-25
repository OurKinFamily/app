import { useEffect, useState } from 'react'
import { useMe } from '../contexts/MeContext'

/**
 * "Your great-grandfather, on your mother's side" — walked in the graph from
 * whoever is signed in. Silent when there is no path, which is most people.
 *
 * Lifted out of PersonOverview so the hero can show it as the line above the
 * name. Two callers, one request each; the browser coalesces them.
 */
export function useRelationship(personId) {
  const { viewerPersonId } = useMe()
  const [label, setLabel] = useState(null)

  useEffect(() => {
    if (!personId) return
    let alive = true
    const url = viewerPersonId
      ? `/api/people/${personId}/relationship?viewer_id=${viewerPersonId}`
      : `/api/people/${personId}/relationship`
    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive) return
        setLabel(d?.label ? `${d.label}${d.side ? `, on ${d.side}` : ''}` : null)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [personId, viewerPersonId])

  return label
}
