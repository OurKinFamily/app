import { useCallback, useEffect, useState } from 'react'

/**
 * Things the archive has noticed and would like a yes or a no about.
 *
 * All of them are guesses drawn from who appears with whom, how often, and
 * when — two people in forty photographs together are probably not strangers.
 * None is acted on without an answer, which is the whole point: a guess
 * applied silently becomes a fact nobody remembers agreeing to.
 */
export function useSuggestions() {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/suggestions/')
      if (res.ok) setSuggestions(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { queueMicrotask(load) }, [load])

  const regenerate = useCallback(async () => {
    setGenerating(true)
    await fetch('/api/suggestions/generate', { method: 'POST' })
    // The scan runs behind the request and finishes shortly after it returns.
    // Reloading straight away shows the old list and reads as "nothing
    // happened".
    setTimeout(() => { setGenerating(false); load() }, 2000)
  }, [load])

  const remove = useCallback(id => {
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }, [])

  return { suggestions, loading, generating, regenerate, remove, reload: load }
}

/** Yes. Write the thing the suggestion proposed, then mark it answered. */
export async function acceptSuggestion(s, answer = {}) {
  const patchPerson = body => fetch(`/api/people/${s.person_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    // A PATCH here replaces the record, so the fields nobody is changing have
    // to be sent back as they were. Leaving them out wiped a nickname the
    // first time this ran.
    body: JSON.stringify({
      name: s.person?.name,
      known_as: s.person?.known_as || null,
      is_living: s.person?.is_living ?? true,
      ...body,
    }),
  })

  const patchGroup = body => fetch(`/api/groups/${s.target_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: s.target?.name, type: s.target?.type, ...body }),
  })

  const post = (url, body) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const year = s.metadata?.suggested_year
  const place = s.metadata?.suggested_location

  switch (s.type) {
    case 'group_membership':
      await post(`/api/groups/${s.target?.id}/members`, { person_id: s.person_id, role: null })
      break
    case 'connection':
      await post(`/api/people/${s.person_id}/connections`, {
        target_id: s.target_id, context: answer.context || null,
      })
      break
    case 'relationship':
      await post(`/api/people/${s.person_id}/relationships`, {
        rel_type: answer.relType, target_id: s.target_id,
      })
      break
    case 'birth_year':
      if (year) await patchPerson({ birth_date: String(year), birth_date_precision: 'year' })
      break
    case 'maiden_name':
      await patchPerson({ maiden_name: answer.maidenName })
      break
    case 'location':
      if (place) await patchGroup({ location_name: place })
      break
    case 'group_year':
      if (year) await patchGroup({ year })
      break
    default:
      break
  }

  await fetch(`/api/suggestions/${s.id}/accept`, { method: 'POST' })
}

export const rejectSuggestion = s =>
  fetch(`/api/suggestions/${s.id}/reject`, { method: 'POST' })

/**
 * What each guess is actually asking, in the words somebody would use.
 *
 * "group_membership: 0.82" is a row in a table. "Was Margaret at Holy Angels
 * too?" is a question a person can answer without being taught the schema
 * first.
 */
export function askAbout(s) {
  const person = s.person?.known_as || s.person?.name || 'they'
  const other = s.target?.name || 'them'
  const year = s.metadata?.suggested_year
  const place = s.metadata?.suggested_location

  return {
    connection: `Did ${person} and ${other} know each other?`,
    relationship: `Were ${person} and ${other} related?`,
    group_membership: `Was ${person} part of ${other}?`,
    birth_year: `Was ${person} born around ${year}?`,
    maiden_name: `What was ${person}'s name before they married?`,
    location: `Was ${other} in ${place}?`,
    group_year: `Did ${other} finish around ${year}?`,
    missing_ancestry: `Nobody is recorded before ${person}.`,
  }[s.type] || s.reason
}

export const KINDS = {
  group_membership: 'Group',
  relationship: 'Family',
  connection: 'Knew each other',
  birth_year: 'Born',
  maiden_name: 'Maiden name',
  location: 'Place',
  group_year: 'Year',
  missing_ancestry: 'No ancestry',
}

export const CONNECTION_KINDS = [
  'Friend', 'Close friend', 'Childhood friend',
  'Coworker', 'Colleague', 'Business partner',
  'Neighbour', 'Acquaintance',
  'Family friend', 'Classmate', 'Teammate',
  'Mentor', 'Mentee', 'Other',
]
