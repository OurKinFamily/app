import { useCallback, useRef, useState } from 'react'

/**
 * Fetches media for whichever date buckets are near the viewport.
 *
 * The virtualised grid doesn't page from the newest photo backwards — it asks
 * for the months it is actually looking at. Scrolling to 2015 costs one
 * request, not a walk through a decade, and that's what makes a date scrubber
 * possible at all.
 *
 * Each bucket is fetched at most once. Requests in flight are tracked so a
 * scroll that crosses a boundary twice doesn't fetch the same month twice.
 */
export function useRangeLoader({ params = '' }) {
  // Loaded items are stamped with the filter they were fetched under, so a
  // filter change invalidates them during render rather than via an effect
  // that sets state and triggers a second pass.
  const [state, setState] = useState({ key: params, items: {} })
  // What has been asked for, stamped with the filter it was asked under, so a
  // filter change resets it lazily inside load() rather than by touching refs
  // during render.
  const tracker = useRef({ key: params, done: new Set(), inFlight: new Set() })

  if (state.key !== params) setState({ key: params, items: {} })
  const itemsByBucket = state.key === params ? state.items : {}

  const setItems = useCallback(updater => {
    setState(prev => ({ ...prev, items: updater(prev.items) }))
  }, [])

  const load = useCallback(async (bucket, count) => {
    const t = tracker.current
    if (t.key !== params) {
      tracker.current = { key: params, done: new Set(), inFlight: new Set() }
    }
    const { done, inFlight } = tracker.current
    if (!bucket || done.has(bucket) || inFlight.has(bucket)) return
    inFlight.add(bucket)
    try {
      // A month bucket is "2015-06"; ask for [2015-06-01, 2015-07-01).
      const [y, m] = bucket.split('-').map(Number)
      const from = `${bucket}-01T00:00:00`
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
      const to = `${next}-01T00:00:00`

      // The API caps a page at 200 and a busy month runs to a thousand, so
      // walk the bucket by offset until it's complete. The counts endpoint
      // already said how many to expect, so this knows when to stop rather
      // than probing for an empty page.
      const PAGE = 200
      const want = count || PAGE
      const collected = []
      for (let offset = 0; offset < want; offset += PAGE) {
        const qs = new URLSearchParams(params)
        qs.set('ts_from', from)
        qs.set('ts_to', to)
        qs.set('limit', String(PAGE))
        qs.set('offset', String(offset))
        qs.set('sort', 'desc')

        const res = await fetch(`/api/gallery?${qs}`)
        if (!res.ok) break
        const d = await res.json()
        const batch = d.media || []
        collected.push(...batch)
        if (batch.length < PAGE) break
        // Show what's arrived rather than making the reader wait for a
        // thousand-photo month to finish.
        setItems(prev => ({ ...prev, [bucket]: [...collected] }))
      }
      setItems(prev => ({ ...prev, [bucket]: collected }))
      tracker.current.done.add(bucket)
    } catch {
      // Leave it unmarked so a later scroll past it tries again.
    } finally {
      tracker.current.inFlight.delete(bucket)
    }
  }, [params, setItems])

  /** Ask for everything currently near the viewport. */
  const ensure = useCallback(visibleGroups => {
    for (const g of visibleGroups) load(g.bucket, g.count)
  }, [load])

  return { itemsByBucket, ensure, isLoaded: b => !!itemsByBucket[b] }
}
