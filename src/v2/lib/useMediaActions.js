import { useCallback } from 'react'

/**
 * Everything the detail view can do to a photograph.
 *
 * Lifted out of the gallery page, which was carrying the data, the URL, the
 * selection and eight API calls, and had grown past the line limit saying so.
 * Any page that opens a photograph — albums, a person, a search result —
 * needs the same eight, and they are the same eight regardless of what put
 * the picture on screen.
 *
 * Each one writes and then leaves the local copy alone. Refetching a whole
 * month to reflect one changed date would throw away the reader's place in an
 * 8.6-million-pixel page.
 */
export function useMediaActions({ openPath, close, onVersion, onRemoved }) {
  const redate = useCallback(async (item, patch) => {
    await fetch(`/api/gallery/media?path=${encodeURIComponent(item.path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }, [])

  const relocate = useCallback(async (item, patch) => {
    await fetch(`/api/gallery/media/location?path=${encodeURIComponent(item.path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }, [])

  const assignFace = useCallback(async (face, person) => {
    await fetch('/api/faces/search/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        person_id: person.id,
        faces: [{ photo_path: openPath, face_index: face.face_index }],
      }),
    })
  }, [openPath])

  const createPerson = useCallback(async (face, name) => {
    // The trailing slash matters. FastAPI answers /people with a 307 to
    // /people/, and the redirect names the API host — which through the dev
    // proxy is a different origin, so the browser drops it and naming a new
    // person silently did nothing.
    const res = await fetch('/api/people/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return
    const person = await res.json()
    if (person?.id) await assignFace(face, person)
  }, [assignFace])

  const unassignFace = useCallback(async person => {
    const q = new URLSearchParams({
      person_id: person.id,
      photo_path: openPath,
      face_index: person.face_index,
    })
    const res = await fetch(`/api/faces/assignment?${q}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`${res.status}`)
  }, [openPath])

  const dismissFace = useCallback(async face => {
    await fetch('/api/faces/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faces: [{ photo_path: openPath, face_index: face.face_index }],
      }),
    })
  }, [openPath])

  const rotate = useCallback(async item => {
    const res = await fetch(
      `/api/gallery/media/rotate?path=${encodeURIComponent(item.path)}&degrees=90`,
      { method: 'POST' },
    )
    if (!res.ok) return
    // The endpoint hands back the file's new modification time. Carrying it
    // into the URL is the whole trick: the address changes, so the browser
    // fetches rather than serving the copy it already has. Closing the
    // lightbox — the old workaround — only hid the stale image; reopening
    // served the same cached bytes.
    //
    // Rotating also swaps the dimensions, and the grid packs rows by aspect.
    const { version, width, height } = await res.json()
    onVersion(item.path, { version, width, height, aspect: width / height })
  }, [onVersion])

  const describe = useCallback(async (item, text) => {
    const res = await fetch(
      `/api/gallery/media/description?path=${encodeURIComponent(item.path)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      },
    )
    if (!res.ok) throw new Error(`${res.status}`)
  }, [])

  const crop = useCallback(async (item, rect) => {
    const q = new URLSearchParams({
      path: item.path, x: rect.x, y: rect.y, w: rect.w, h: rect.h,
      angle: rect.angle || 0,
    })
    const res = await fetch(`/api/gallery/media/crop?${q}`, { method: 'POST' })
    if (!res.ok) return
    // Same trick as rotate: the file keeps its URL, so without a new token the
    // browser goes on showing the uncropped picture it already has.
    const { version, width, height } = await res.json()
    onVersion(item.path, { version, width, height, aspect: width / height })
  }, [onVersion])

  // Restoration is three steps, and the middle one is a person looking at it.
  const restorePreview = useCallback(async item => {
    const res = await fetch(
      `/api/gallery/media/restore?path=${encodeURIComponent(item.path)}`,
      { method: 'POST' },
    )
    if (!res.ok) {
      // The reason matters here: "out of memory" and "no such file" call for
      // completely different things from the reader, and a spinner that
      // simply stops tells them neither.
      const body = await res.json().catch(() => null)
      throw new Error(body?.detail || `The restoration failed (${res.status}).`)
    }
    return res.json()
  }, [])

  const restoreDiscard = useCallback(async item => {
    await fetch(`/api/gallery/media/restore?path=${encodeURIComponent(item.path)}`,
      { method: 'DELETE' })
  }, [])

  const restoreApply = useCallback(async item => {
    const res = await fetch(
      `/api/gallery/media/restore/apply?path=${encodeURIComponent(item.path)}`,
      { method: 'POST' },
    )
    if (!res.ok) throw new Error(`${res.status}`)
    const { version, width, height } = await res.json()
    onVersion(item.path, { version, width, height, aspect: width / height })
  }, [onVersion])

  const remove = useCallback(async item => {
    const res = await fetch(`/api/gallery/media?path=${encodeURIComponent(item.path)}`, {
      method: 'DELETE',
    })
    if (!res.ok) return
    // Tell the page, so the tile goes with it. A deleted photograph that sits
    // in the grid until a reload invites a second delete on something that is
    // already gone.
    onRemoved?.(item.path)
    close()
  }, [close, onRemoved])

  const download = useCallback(item => {
    const a = document.createElement('a')
    a.href = item.url
    a.download = item.filename || ''
    a.click()
  }, [])

  return {
    redate, relocate, assignFace, createPerson, dismissFace, unassignFace,
    rotate, crop, describe, remove, download,
    restorePreview, restoreDiscard, restoreApply,
  }
}
