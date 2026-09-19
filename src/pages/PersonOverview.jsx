import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { PersonFacts, PersonFactsForm } from '../ui/PersonFacts'
import { PersonPhotos } from '../ui/PersonPhotos'
import { PersonSummary } from '../ui/PersonSummary'
import { LifeStages } from '../ui/LifeStages'
import { useIsAdmin, useMe } from '../contexts/MeContext'

/**
 * A person's overview: how they are related to you, what is known, the years
 * of their life as pictures, and everything they appear in.
 */
export function PersonOverview() {
  const { person, setPerson, editing, setEditing } = useOutletContext()
  const isAdmin = useIsAdmin()
  const relationship = useRelationship(person.id)

  return (
    <div>
      <PersonSummary personId={person.id} />

      {editing ? (
        <PersonFactsForm
          person={person}
          onSaved={updated => { setPerson(updated); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <PersonFacts
          person={person}
          relationship={relationship}
          canEdit={isAdmin}
          onEdit={() => setEditing(true)}
        />
      )}

      <LifeStages personId={person.id} />

      <PersonPhotos personId={person.id} />
    </div>
  )
}

/**
 * "Your great-grandfather, on your mother's side" — walked in the graph from
 * whoever is signed in. Silent when there is no path, which is most people.
 */
function useRelationship(personId) {
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
