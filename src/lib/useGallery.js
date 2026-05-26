import { useState, useEffect, useRef, useCallback } from 'react'

const LIMIT = 48

// Bidirectional gallery hook with timestamp-cursor pagination.
// anchor: { year } | null — on change, resets and loads that year (DESC).
//   When unanchored, starts from the newest items (no upward direction).
// Returns: media (DESC by timestamp), loading, hasMoreOlder, hasMoreNewer,
//          loadOlder, loadNewer.
export function useGallery({ anchor = null, params = {} } = {}) {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMoreOlder, setHasMoreOlder] = useState(true)
  const [hasMoreNewer, setHasMoreNewer] = useState(false)

  const loadingRef = useRef(false)
  const newestRef = useRef(null)
  const oldestRef = useRef(null)
  const mediaRef = useRef([])
  const key = JSON.stringify({ anchor, params })

  useEffect(() => {
    let alive = true
    mediaRef.current = []
    newestRef.current = null
    oldestRef.current = null
    loadingRef.current = true
    // State (media, loading) updated by the async callback below to avoid
    // synchronous setState in the effect body.

    const qs = new URLSearchParams({ limit: LIMIT, sort: 'desc', ...params })
    if (anchor?.year != null) { qs.set('year_from', anchor.year); qs.set('year_to', anchor.year) }

    fetch(`/api/gallery?${qs}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive || !d) return
        const batch = d.media || []
        mediaRef.current = batch
        if (batch.length) {
          newestRef.current = batch[0].timestamp
          oldestRef.current = batch[batch.length - 1].timestamp
        }
        setMedia(batch)
        setLoading(false)
        setHasMoreOlder(batch.length >= LIMIT || !!d.has_more)
        setHasMoreNewer(anchor != null)
      })
      .catch(() => {})
      .finally(() => { if (alive) { loadingRef.current = false; setLoading(false) } })

    return () => { alive = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadOlder = useCallback(async (skipMs = 0) => {
    if (loadingRef.current || !oldestRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const oldestTs = new Date(oldestRef.current).getTime()
      const ts_to = skipMs > 0 ? new Date(oldestTs - skipMs).toISOString() : oldestRef.current
      const qs = new URLSearchParams({ limit: LIMIT, sort: 'desc', ...params })
      qs.set('ts_to', ts_to)
      const res = await fetch(`/api/gallery?${qs}`)
      const d = await res.json()
      const batch = (d.media || []).filter(m => m.timestamp !== oldestRef.current)
      if (batch.length) {
        const additions = []
        if (skipMs > 0) {
          // visualize the skipped range as gray placeholder tiles
          const gapStart = oldestTs - skipMs
          const gapEnd = oldestTs
          for (let i = 0; i < 12; i++) {
            additions.push({
              path: `__gap__${gapStart}_${i}`,
              __gap: true,
              width: 1, height: 1,
              dominant_color: '#1d1d1d',
              timestamp: new Date(gapStart + (gapEnd - gapStart) * ((i + 0.5) / 12)).toISOString(),
            })
          }
        }
        additions.push(...batch)
        mediaRef.current = [...mediaRef.current, ...additions]
        oldestRef.current = batch[batch.length - 1].timestamp
        setMedia([...mediaRef.current])
      }
      setHasMoreOlder(batch.length >= LIMIT - 1)
    } catch { /* ignore */ }
    finally { loadingRef.current = false; setLoading(false) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadNewer = useCallback(async () => {
    if (loadingRef.current || !newestRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const qs = new URLSearchParams({ limit: LIMIT, sort: 'asc', ...params })
      qs.set('ts_from', newestRef.current)
      const res = await fetch(`/api/gallery?${qs}`)
      const d = await res.json()
      const batch = (d.media || []).filter(m => m.timestamp !== newestRef.current)
      if (batch.length) {
        const reversed = [...batch].reverse() // ASC → DESC for prepend
        mediaRef.current = [...reversed, ...mediaRef.current]
        newestRef.current = reversed[0].timestamp
        setMedia([...mediaRef.current])
      }
      setHasMoreNewer(batch.length >= LIMIT - 1)
    } catch { /* ignore */ }
    finally { loadingRef.current = false; setLoading(false) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return { media, loading, hasMoreOlder, hasMoreNewer, loadOlder, loadNewer }
}
