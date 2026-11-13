import { useEffect, useState } from 'react'
import { captionTrack } from './captions'

/**
 * The caption track for a video, fetching the detail record if nobody has
 * already supplied it.
 *
 * MediaDetail only learns a photo's detail when InfoPanel hands it back, and
 * InfoPanel only renders when the info panel is open. On a wide screen with
 * the panel closed that never happens — so captions keyed off that state
 * alone would appear only for people who happened to open the info panel.
 *
 * Images are skipped: nothing but video has a transcript, and there is no
 * reason to make a request per photograph in a gallery someone is paging
 * through.
 *
 * The result is stored with the path it was fetched for rather than cleared
 * on the way in, so paging to the next video cannot briefly show the previous
 * one's captions, and the effect never sets state synchronously.
 */
export function useVideoCaptions({ path, isVideo, detail }) {
  const [fetched, setFetched] = useState(null)

  useEffect(() => {
    if (!isVideo || !path || detail) return undefined
    let live = true
    fetch(`/api/gallery/detail?path=${encodeURIComponent(path)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (live && d) setFetched({ path, detail: d }) })
      .catch(() => {})
    return () => { live = false }
  }, [path, isVideo, detail])

  const forThisVideo = fetched && fetched.path === path ? fetched.detail : null
  return captionTrack(detail ?? forThisVideo)
}
