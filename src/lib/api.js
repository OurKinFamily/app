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

export async function getFaces(id) {
  const res = await fetch(`${BASE}/people/${id}/faces`)
  if (!res.ok) throw new Error('Failed to fetch faces')
  return res.json()
}

export async function getPhotos(id, limit = 100, offset = 0) {
  const res = await fetch(`${BASE}/people/${id}/photos?limit=${limit}&offset=${offset}`)
  if (!res.ok) throw new Error('Failed to fetch photos')
  return res.json()
}

export async function setAvatar(personId, cropPath) {
  const res = await fetch(`${BASE}/people/${personId}/avatar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ crop_path: cropPath }),
  })
  if (!res.ok) throw new Error('Failed to set avatar')
}

export async function unassignFace(personId, photoPath, faceIndex) {
  const qs = new URLSearchParams({ person_id: personId, photo_path: photoPath, face_index: String(faceIndex) })
  const res = await fetch(`${BASE}/faces/assignment?${qs}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to unassign face')
}

export async function deleteMedia(path) {
  const res = await fetch(`${BASE}/gallery/media?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete media')
}

export async function redateMedia(path, { timestamp, precision }) {
  const res = await fetch(`${BASE}/gallery/media?path=${encodeURIComponent(path)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timestamp, precision }),
  })
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json())?.detail || '' } catch { /* noop */ }
    throw new Error(detail || 'Failed to redate media')
  }
  return res.json()
}

export async function setCover(personId, photoPath, position) {
  const res = await fetch(`${BASE}/people/${personId}/cover`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_path: photoPath, position }),
  })
  if (!res.ok) throw new Error('Failed to set cover')
}

export async function addRelationship(personId, data) {
  const res = await fetch(`${BASE}/people/${personId}/relationships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to add relationship')
}

export async function getClusters(status = 'unassigned', limit = 100, offset = 0) {
  const res = await fetch(`${BASE}/faces/clusters?status=${status}&limit=${limit}&offset=${offset}`)
  if (!res.ok) throw new Error('Failed to fetch clusters')
  return res.json()
}

export async function getCluster(id) {
  const res = await fetch(`${BASE}/faces/clusters/${id}`)
  if (!res.ok) throw new Error('Cluster not found')
  return res.json()
}

// exclude: faces to permanently skip (won't reappear after reclustering).
// include: when provided, only these faces get assigned — remainder stays in
// the cluster for future partial assigns.
export async function assignCluster(clusterId, personId, { exclude = [], include = null } = {}) {
  const res = await fetch(`${BASE}/faces/clusters/${clusterId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      person_id: personId,
      exclude:   exclude.length ? exclude : null,
      include,
    }),
  })
  if (!res.ok) throw new Error('Failed to assign cluster')
}

export async function skipCluster(clusterId) {
  const res = await fetch(`${BASE}/faces/clusters/${clusterId}/skip`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to skip cluster')
}

export async function unskipCluster(clusterId) {
  const res = await fetch(`${BASE}/faces/clusters/${clusterId}/unskip`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to unskip cluster')
}
