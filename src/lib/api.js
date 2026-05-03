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
