import { useCallback, useEffect, useState } from 'react'

/**
 * One circle — a team, a class, a workplace — and who was in it.
 *
 * Reloaded from the server after every change rather than patched in place.
 * Membership carries a role, and the graph decides what a role looks like once
 * it is stored; guessing that locally is how a list starts disagreeing with
 * the thing it is showing.
 */
export function useGroup(id) {
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}`)
    if (res.ok) setGroup(await res.json())
    else setMissing(true)
    setLoading(false)
  }, [id])

  useEffect(() => { queueMicrotask(load) }, [load])

  const removeMember = useCallback(async personId => {
    await fetch(`/api/groups/${id}/members/${personId}`, { method: 'DELETE' })
    load()
  }, [id, load])

  const addMembers = useCallback(async (people, role) => {
    await Promise.all(people.map(p => fetch(`/api/groups/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: p.id, role: role || null }),
    })))
    load()
  }, [id, load])

  const save = useCallback(async form => {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        year: form.year ? parseInt(form.year, 10) : null,
        season: form.season || null,
        notes: form.notes || null,
        location_name: form.location?.name || null,
        latitude: form.location?.lat || null,
        longitude: form.location?.lng || null,
      }),
    })
    const updated = await res.json()
    setGroup(g => ({ ...g, ...updated }))
    return updated
  }, [id])

  const remove = useCallback(
    () => fetch(`/api/groups/${id}`, { method: 'DELETE' }),
    [id],
  )

  return { group, loading, missing, reload: load, removeMember, addMembers, save, remove }
}

/** Somewhere in the world, from OpenStreetMap. */
export async function findPlaces(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } },
  )
  return res.ok ? res.json() : []
}

/**
 * Nominatim answers with the whole postal address — street, county, postcode,
 * country. A group is "Perkiomen Valley, Pennsylvania", not seven commas of it.
 */
export const shortPlace = result =>
  result.display_name.split(',').slice(0, 2).join(',').trim()
