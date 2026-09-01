import { useState, useEffect, useRef, useCallback } from 'react'

// Page size for scrolling. Kept small on purpose: the API serves 200 as fast as
// 48 (473ms vs 462ms), but the browser does not — a big page means that many
// tiles laid out and that many thumbnails requested at once, which is what the
// user actually waits for. Skip-ahead, not page size, is how you cover ground.
const LIMIT = 48

// Backfilling a skipped range is bulk background work with nothing rendering
// until it lands, so it pays the per-request overhead as few times as possible.
const GAP_LIMIT = 200

// Bidirectional gallery hook with timestamp-cursor pagination.
// anchor: { year } | null — on change, resets and loads that year (DESC).
//   When unanchored, starts from the newest items (no upward direction).
// Returns: media (DESC by timestamp), loading, hasMoreOlder, hasMoreNewer,
//          loadOlder, loadNewer.
export function useGallery({ anchor = null, params = {} } = {}) {
  const [media, setMedia] = useState([])
  const [total, setTotal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasMoreOlder, setHasMoreOlder] = useState(true)
  const [hasMoreNewer, setHasMoreNewer] = useState(false)

  const loadingRef = useRef(false)
  const newestRef = useRef(null)
  const oldestRef = useRef(null)
  const offsetRef = useRef(0)        // offset cursor for undated mode (null timestamps)
  const mediaRef = useRef([])
  const key = JSON.stringify({ anchor, params })

  // Undated media all have timestamp === null, so the timestamp-cursor
  // pagination below can't advance (the cursor is null). Fall back to plain
  // offset pagination in that mode.
  const undatedMode = !!params.undated

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
        offsetRef.current = batch.length
        setMedia(batch)
        setTotal(typeof d.total === 'number' ? d.total : null)
        setLoading(false)
        setHasMoreOlder(batch.length >= LIMIT || !!d.has_more)
        setHasMoreNewer(anchor != null)
      })
      .catch(() => {})
      .finally(() => { if (alive) { loadingRef.current = false; setLoading(false) } })

    return () => { alive = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadOlder = useCallback(async (skipMs = 0) => {
    // Undated mode: timestamps are null, so paginate by offset instead of the
    // timestamp cursor (which would never advance). No gap/skip logic here —
    // there's no timeline to skip across.
    if (undatedMode) {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      try {
        const qs = new URLSearchParams({ limit: LIMIT, sort: 'desc', ...params })
        qs.set('offset', offsetRef.current)
        const res = await fetch(`/api/gallery?${qs}`)
        const d = await res.json()
        const batch = d.media || []
        if (batch.length) {
          const seen = new Set(mediaRef.current.map(m => m.path))
          const fresh = batch.filter(m => m.path && !seen.has(m.path))
          mediaRef.current = [...mediaRef.current, ...fresh]
          offsetRef.current += batch.length
          setMedia([...mediaRef.current])
        }
        const total = typeof d.total === 'number' ? d.total : null
        setHasMoreOlder(total != null ? offsetRef.current < total : batch.length >= LIMIT)
      } catch { /* ignore */ }
      finally { loadingRef.current = false; setLoading(false) }
      return
    }
    if (loadingRef.current || !oldestRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const oldestIso = oldestRef.current
      const ts_to = skipMs > 0
        ? new Date(new Date(oldestIso).getTime() - skipMs).toISOString()
        : oldestIso
      const qs = new URLSearchParams({ limit: LIMIT, sort: 'desc', ...params })
      qs.set('ts_to', ts_to)
      const res = await fetch(`/api/gallery?${qs}`)
      const d = await res.json()
      const batch = (d.media || []).filter(m => m.timestamp !== oldestIso)
      if (batch.length) {
        const additions = []
        if (skipMs > 0) {
          // Visualize skipped range with placeholder tiles. Each gap is tagged
          // with the range it covers — when these tiles come into view and the
          // user dwells, MediaGallery calls fillGap() to splice in real items
          // from that range, replacing the placeholders.
          const gapFromTs = batch[0].timestamp     // newer side of the skipped slice (= top of fetched batch)
          const gapToTs   = oldestIso              // older boundary of the previously-loaded items
          for (let i = 0; i < 12; i++) {
            additions.push({
              path: `__gap__${oldestIso}_${i}`,
              __gap: true,
              gapFromTs, gapToTs,
              width: 1, height: 1,
              dominant_color: '#1d1d1d',
              timestamp: oldestIso,
            })
          }
        }
        additions.push(...batch)
        // Defensive: dedupe by path so a pagination cursor overlap can't
        // duplicate items in the rendered grid.
        const seen = new Set(mediaRef.current.map(m => m.path))
        const fresh = additions.filter(m => m.__gap || (m.path && !seen.has(m.path)))
        mediaRef.current = [...mediaRef.current, ...fresh]
        oldestRef.current = batch[batch.length - 1].timestamp
        setMedia([...mediaRef.current])
      }
      setHasMoreOlder(batch.length > 0)
    } catch { /* ignore */ }
    finally { loadingRef.current = false; setLoading(false) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Replace gap placeholders covering [from, to) with real items fetched from
  // that range. Called by MediaGallery when gap tiles dwell in view.
  const fillingGapsRef = useRef(new Set())
  const fillGap = useCallback(async ({ from, to }) => {
    const key2 = `${from}|${to}`
    if (fillingGapsRef.current.has(key2)) return
    fillingGapsRef.current.add(key2)
    try {
      // Page the WHOLE range, not one batch.
      //
      // regression(2026-08-31): this fetched a single limit=200 page. One real
      // gap held 896 items, so 696 of them were dropped on the floor — and
      // because the placeholders were replaced regardless, the grid then looked
      // complete. Walk the cursor down until the range is exhausted.
      const batch = []
      let cursor = to
      for (;;) {
        const qs = new URLSearchParams({ limit: GAP_LIMIT, sort: 'desc', ...params })
        qs.set('ts_from', from)
        qs.set('ts_to', cursor)
        const res = await fetch(`/api/gallery?${qs}`)
        const d = await res.json()
        const page = (d.media || []).filter(m => m.timestamp !== cursor)
        if (!page.length) break
        batch.push(...page)
        cursor = page[page.length - 1].timestamp
        if (page.length < GAP_LIMIT) break
      }
      const without = mediaRef.current.filter(
        m => !(m.__gap && m.gapFromTs === from && m.gapToTs === to),
      )
      const merged = [...without, ...batch].sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
        return tb - ta
      })
      // Defensive: keep first occurrence by path (gaps allowed to repeat).
      const seen = new Set()
      const deduped = merged.filter(m => {
        if (m.__gap || !m.path) return true
        if (seen.has(m.path)) return false
        seen.add(m.path); return true
      })
      mediaRef.current = deduped
      setMedia([...deduped])
    } catch { /* ignore */ }
    finally { fillingGapsRef.current.delete(key2) }
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
        // Defensive: drop any paths already in the existing list so prepending
        // a window of items can't duplicate ones we already have.
        const existing = new Set(mediaRef.current.map(m => m.path))
        const fresh = batch.filter(m => m.path && !existing.has(m.path))
        if (fresh.length) {
          const reversed = [...fresh].reverse() // ASC → DESC for prepend
          mediaRef.current = [...reversed, ...mediaRef.current]
          newestRef.current = reversed[0].timestamp
          setMedia([...mediaRef.current])
        }
      }
      setHasMoreNewer(batch.length > 0)
    } catch { /* ignore */ }
    finally { loadingRef.current = false; setLoading(false) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Drop an item from the in-memory list — used by callers (lightbox
  // delete) that mutate the backend and want the gallery to reflect it
  // without a full refetch. Cursors stay where they are.
  const removeItem = useCallback(path => {
    if (!path) return
    mediaRef.current = mediaRef.current.filter(m => m.path !== path)
    setMedia([...mediaRef.current])
  }, [])

  return { media, total, loading, hasMoreOlder, hasMoreNewer, loadOlder, loadNewer, fillGap, removeItem }
}
