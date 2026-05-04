const BASE = '/api'

export async function getPeople() {
  const res = await fetch(`${BASE}/people/`)
  if (!res.ok) throw new Error('Failed to fetch people')
  return res.json()
}

export async function getPerson(id) {
  const res = await fetch(`${BASE}/people/${id}`)
  if (!res.ok) throw new Error('Person not found')
  return res.json()
}

export async function getRelatives(id) {
  const res = await fetch(`${BASE}/people/${id}/relatives`)
  if (!res.ok) throw new Error('Failed to fetch relatives')
  return res.json()
}

export async function searchPeople(q) {
  const res = await fetch(`${BASE}/people/search?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export async function createPerson(data) {
  const res = await fetch(`${BASE}/people/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create person')
  return res.json()
}

export async function addRelationship(personId, data) {
  const res = await fetch(`${BASE}/people/${personId}/relationships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to add relationship')
}
