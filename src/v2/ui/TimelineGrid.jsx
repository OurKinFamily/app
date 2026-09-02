import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MediaGrid } from './MediaGrid'
import { DateScrubber } from './DateScrubber'
import { LoadingDots } from './LoadingDots'

/**
 * The gallery: honest infinite scroll, plus a way to go anywhere.
 *
 * This replaces a virtualised timeline that reserved space for months it had
 * never seen, using estimated heights. That approach needs three pieces of
 * machinery to stay upright — estimates, scroll anchoring to correct them when
 * the real height arrives, and accelerated wheel scrolling to make an
 * 8.6-million-pixel page crossable — and all three exist to prop up the same
 * lie: that the whole archive is laid out when it isn't.
 *
 * The estimate is never right (a month of portraits is nothing like a month of
 * landscapes), so the correction always fires, and the reader gets moved after
 * they have stopped. Better to only claim what is actually there.
 *
 * So: months load one after another as you reach the bottom, and the scrubber
 * jumps by FETCHING a month rather than travelling to it. Getting to 2009 costs
 * one request whether you are in 2026 or 2010.
 */

function labelFor(bucket) {
  return new Date(bucket + '-01T00:00:00')
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

async function fetchMonth(bucket, count, params) {
  const [y, m] = bucket.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  const PAGE = 200
  const out = []
  // The counts endpoint already said how many are here, so this knows when to
  // stop rather than probing for an empty page.
  for (let offset = 0; offset < (count || PAGE); offset += PAGE) {
    const qs = new URLSearchParams(params)
    qs.set('ts_from', `${bucket}-01T00:00:00`)
    qs.set('ts_to', `${next}-01T00:00:00`)
    qs.set('limit', String(PAGE))
    qs.set('offset', String(offset))
    qs.set('sort', 'desc')
    const res = await fetch(`/api/gallery?${qs}`)
    if (!res.ok) break
    const d = await res.json()
    const batch = d.media || []
    out.push(...batch)
    if (batch.length < PAGE) break
  }
  return out
}

export function TimelineGrid({
  buckets,              // from /gallery/counts, newest first
  params = '',
  onOrderedChange,
  ...gridProps
}) {
  // Months currently on the page, in order, each with its items once loaded.
  const [loaded, setLoaded] = useState([])
  const [busy, setBusy] = useState(false)
  const [current, setCurrent] = useState(null)
  const loadingRef = useRef(false)
  const bottomRef = useRef(null)
  const topRef = useRef(null)
  const boxRef = useRef(null)
  // One measurement for every month, so a newly added grid renders at its real
  // size immediately rather than expanding a frame later.
  const [width, setWidth] = useState(0)
  // Height owed after prepending: adding content above the viewport pushes
  // everything down, and without correcting for it the reader is thrown
  // backwards every time an older month loads at the top.
  const pendingTop = useRef(0)
  // The month a jump is aiming at, scrolled to once it has actually rendered.
  // Set after a jump: bring the newer months in above without moving the
  // reader off the month they asked for.
  const prefillNewer = useRef(false)

  useLayoutEffect(() => {
    if (!boxRef.current) return
    const ro = new ResizeObserver(e => setWidth(Math.floor(e[0].contentRect.width)))
    ro.observe(boxRef.current)
    return () => ro.disconnect()
  }, [])

  const indexOf = useCallback(
    b => (buckets || []).findIndex(x => x.bucket === b),
    [buckets],
  )

  /** Append the next OLDER month. */
  const loadOlder = useCallback(async () => {
    if (loadingRef.current || !buckets?.length || !loaded.length) return
    // Walk the counts list rather than stepping month by month: most of this
    // archive's months are empty and stepping would stall on every gap.
    const next = buckets[indexOf(loaded[loaded.length - 1].bucket) + 1]
    if (!next) return
    loadingRef.current = true
    setBusy(true)
    try {
      const items = await fetchMonth(next.bucket, next.count, params)
      setLoaded(prev => [...prev, { bucket: next.bucket, label: labelFor(next.bucket), items }])
    } finally {
      loadingRef.current = false
      setBusy(false)
    }
  }, [buckets, loaded, indexOf, params])

  /** Prepend the next NEWER month, so a jump is a place to start rather than
   *  a filter — you can scroll back up out of 2014 into 2015. */
  const loadNewer = useCallback(async () => {
    if (loadingRef.current || !buckets?.length || !loaded.length) return
    let idx = indexOf(loaded[0].bucket)
    if (idx <= 0) return

    loadingRef.current = true
    setBusy(true)
    try {
      // Take several months at once when they are thin.
      //
      // Prepending shifts everything down, so the scroll is corrected to hold
      // the reader still — which leaves the top sentinel exactly where it was.
      // A sparse month (1916 has a handful of photographs) adds less height
      // than the trigger margin, so the sentinel fires again straight away, and
      // the reader sits pinned while month after month arrives above them. It
      // is loading, but it feels frozen.
      //
      // Gathering enough to clear the margin in ONE prepend ends that: after
      // the correction the sentinel is genuinely out of range again.
      const batch = []
      let gathered = 0
      while (idx > 0 && gathered < 60 && batch.length < 12) {
        const prev = buckets[idx - 1]
        const items = await fetchMonth(prev.bucket, prev.count, params)
        batch.unshift({ bucket: prev.bucket, label: labelFor(prev.bucket), items })
        gathered += items.length
        idx -= 1
      }
      if (!batch.length) return
      pendingTop.current = document.documentElement.scrollHeight
      setLoaded(cur => [...batch, ...cur])
    } finally {
      loadingRef.current = false
      setBusy(false)
    }
  }, [buckets, loaded, indexOf, params])

  // Keep the reader still while content appears above them.
  useLayoutEffect(() => {
    if (!pendingTop.current) return
    const grew = document.documentElement.scrollHeight - pendingTop.current
    pendingTop.current = 0
    if (grew > 0) window.scrollBy(0, grew)
  }, [loaded])

  /** Start again from a chosen month — the newest one on the page, with
   *  everything older still reachable below and everything newer above. */
  const jumpTo = useCallback(async bucket => {
    loadingRef.current = true
    setBusy(true)
    setLoaded([])
    window.scrollTo(0, 0)
    try {
      const target = buckets.find(x => x.bucket === bucket)
      if (!target) return
      const items = await fetchMonth(bucket, target.count, params)
      setLoaded([{ bucket, label: labelFor(bucket), items }])
      setCurrent(bucket)
    } finally {
      loadingRef.current = false
      setBusy(false)
    }
    // Then pull the newer months in ABOVE, using the ordinary prepend path.
    //
    // Loading them first and scrolling to the target afterwards does not work:
    // the months above are still fetching their images, so their heights grow
    // and push the target down — you click November and end up looking at
    // December. Prepending holds the reader's position by construction, which
    // is exactly what is wanted here.
    prefillNewer.current = true
  }, [buckets, params])

  // First month. Guarded by a ref rather than by `loaded`, so it runs exactly
  // once per set of buckets and cannot re-fire while the first fetch is still
  // in flight.
  const started = useRef(false)
  useEffect(() => {
    if (started.current || !buckets?.length) return
    started.current = true
    jumpTo(buckets[0].bucket)
  }, [buckets, jumpTo])

  // Sentinels. Observers rather than scroll handlers: they fire when an end is
  // actually near, not on every pixel of movement.
  //
  // Created ONCE. Rebuilding them whenever loadOlder's identity changed — which
  // is every time a month lands — made each new observer fire immediately
  // against a still-short page, loading month after month as fast as it could
  // and taking the tab with it. Refs keep the current functions reachable.
  const olderRef = useRef(loadOlder)
  const newerRef = useRef(loadNewer)
  useEffect(() => { olderRef.current = loadOlder }, [loadOlder])
  useEffect(() => { newerRef.current = loadNewer }, [loadNewer])

  useEffect(() => {
    const down = new IntersectionObserver(
      e => { if (e[0].isIntersecting) olderRef.current?.() },
      { rootMargin: '600px' })
    // Tighter at the top: scrolling upward should reach the actual edge before
    // more is fetched, or it re-triggers through its own correction.
    const up = new IntersectionObserver(
      e => { if (e[0].isIntersecting) newerRef.current?.() },
      { rootMargin: '150px' })
    if (bottomRef.current) down.observe(bottomRef.current)
    if (topRef.current) up.observe(topRef.current)
    return () => { down.disconnect(); up.disconnect() }
  }, [])

  // After a jump, bring the newer months in once. A ref rather than state:
  // this is a one-shot instruction to an effect, not something the render
  // depends on, and setting state inside the effect would cost a second pass.
  useEffect(() => {
    if (!prefillNewer.current || busy || !loaded.length) return
    prefillNewer.current = false
    newerRef.current?.()
  }, [busy, loaded.length])

  // Keep filling until the page is actually long enough to scroll.
  //
  // IntersectionObserver only fires on a CHANGE of intersection. The sentinel
  // is already visible while the first fetch is in flight, so that callback
  // early-returns — and since the state never changes afterwards, nothing ever
  // calls it again. The newest month is three photographs, so the gallery sat
  // there showing three photographs and looked like a filter.
  //
  // Checking after each load covers it: a short page keeps asking until it
  // isn't short, or until the archive runs out.
  useEffect(() => {
    if (busy || !loaded.length) return
    const el = bottomRef.current
    if (!el) return
    const near = el.getBoundingClientRect().top < window.innerHeight + 600
    if (near) olderRef.current?.()
  }, [loaded, busy])

  // Which month is at the top, for the scrubber's highlight.
  useEffect(() => {
    const onScroll = () => {
      for (const el of document.querySelectorAll('[data-bucket]')) {
        if (el.getBoundingClientRect().bottom > 80) {
          setCurrent(el.getAttribute('data-bucket'))
          break
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    onOrderedChange?.(loaded.flatMap(m => m.items || []))
  }, [loaded, onOrderedChange])

  return (
    <div ref={boxRef}>
      <DateScrubber buckets={buckets} current={current} onJump={jumpTo} />

      {/* Sentinel for scrolling back towards the present. */}
      <div ref={topRef} style={{ height: 1 }} />

      {loaded.map(m => (
        <div key={m.bucket} data-bucket={m.bucket}>
          <MediaGrid {...gridProps} items={m.items} width={width} showUndatedSection={false} />
        </div>
      ))}

      <div ref={bottomRef} style={{ height: 1 }} />

      {busy && <LoadingDots />}
    </div>
  )
}
