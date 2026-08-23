// Phone-upload API surface. Kept out of api.js (which is already at its
// max-lines cap) since uploads are a self-contained feature.
const BASE = '/api'

// Upload N photos/videos from the device. destination = 'gallery' (into the
// archive, visible in the grid) or 'staging' (parked for later review). Returns
// a job { id, status, files } to poll with getUploadStatus.
export async function uploadMedia(files, destination = 'staging') {
  const form = new FormData()
  for (const f of files) form.append('files', f)
  form.append('destination', destination)
  const res = await fetch(`${BASE}/gallery/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json())?.detail || '' } catch { /* noop */ }
    throw new Error(detail || 'Upload failed')
  }
  return res.json()
}

export async function getUploadStatus(jobId) {
  const res = await fetch(`${BASE}/gallery/upload/${jobId}`)
  if (!res.ok) throw new Error('Failed to fetch upload status')
  return res.json()
}
