import { useState, useEffect, useRef, useCallback } from 'react'

const LIMIT = 48

// Paginated gallery fetch. params (filters) reset the list when they change.
// Optional opts.seed = { items, offset } skips the initial fetch (used when another page
// already loaded these and we want to continue paging from where they left off).
// Returns: { media, loading, hasMore, loadMore }
export function useGallery(params = {}, opts = {}) {
  const seed = opts.seed
  const [media, setMedia] = useState(seed?.items || [])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const loadingRef = useRef(false)
  const offsetRef = useRef(seed?.offset ?? (seed?.items?.length || 0))
  const hasMoreRef = useRef(true)
  const mediaRef = useRef(seed?.items ? [...seed.items] : [])
  const paramsKey = JSON.stringify(params)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const qs = new URLSearchParams({ limit: LIMIT, offset: offsetRef.current, ...params }).toString()
      const res = await fetch(`/api/gallery?${qs}`)
      const data = await res.json()
      const batch = Array.isArray(data.media) ? data.media : []
      mediaRef.current = [...mediaRef.current, ...batch]
      setMedia([...mediaRef.current])
      offsetRef.current += batch.length
      hasMoreRef.current = !!data.has_more
      setHasMore(!!data.has_more)
    } catch (e) {
      console.error('Gallery fetch failed', e)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [paramsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset + first load on mount and when params change.
  // State updates happen inside async callbacks (allowed), refs are reset synchronously.
  useEffect(() => {
    let alive = true
    mediaRef.current = []
    offsetRef.current = 0
    hasMoreRef.current = true
    loadingRef.current = false

    const load = async () => {
      const qs = new URLSearchParams({ limit: LIMIT, offset: 0, ...params }).toString()
      try {
        const res = await fetch(`/api/gallery?${qs}`)
        const data = await res.json()
        if (!alive) return
        const batch = Array.isArray(data.media) ? data.media : []
        mediaRef.current = batch
        offsetRef.current = batch.length
        hasMoreRef.current = !!data.has_more
        setMedia(batch)
        setHasMore(!!data.has_more)
      } catch (e) {
        console.error('Gallery fetch failed', e)
      }
    }
    load()
    return () => { alive = false }
  }, [paramsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return { media, loading, hasMore, loadMore }
}
