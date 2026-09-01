import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MediaGrid } from './MediaGrid'
import { GAP, rowHeightFor } from './gridLayout'
import { useTimeline } from './useTimeline'
import { useRangeLoader } from './useRangeLoader'
import { useAcceleratedScroll } from './useAcceleratedScroll'
import { C } from './tokens'

/**
 * The gallery at archive scale.
 *
 * Wraps MediaGrid with two things it deliberately does not own: knowing how
 * tall the whole timeline is, and fetching the parts of it you are looking at.
 *
 * The shape of the timeline comes from /gallery/counts — one row per month for
 * the entire archive, about 600 rows and 280ms — so the page can be the right
 * height before a single photograph has loaded. That is what makes the
 * scrollbar honest and a date scrubber possible: jumping to June 2015 is a
 * lookup, not a walk back through a decade of paging.
 *
 * Only the months near the viewport are rendered. The rest are plain spacer
 * divs of the right height. A month that has never been rendered uses an
 * estimate; once rendered, its measured height replaces the estimate for good,
 * so the page settles rather than shifting under the reader repeatedly.
 */

// A month that isn't loaded yet still occupies its space, filled with grey
// tiles. An unfilled gap looks like the end of the archive, which is exactly
// the failure this design is meant to prevent.
function PlaceholderRows({ count, width, rowHeight }) {
  const perRow = Math.max(1, Math.floor(width / (rowHeight * 1.45)))
  const rows = Math.min(Math.ceil(count / perRow), 40)
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: GAP, marginBottom: GAP }}>
          {Array.from({ length: perRow }).map((_, c) => (
            <div
              key={c}
              style={{
                flex: '1 1 0', height: rowHeight,
                background: C.hover,
              }}
            />
          ))}
        </div>
      ))}
    </>
  )
}

/** One month: real photographs once loaded, grey placeholders until then. */
function Group({ group, items, width, rowHeight, onHeight, children }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    // Report what it actually came out at, so the timeline can stop guessing.
    const ro = new ResizeObserver(e => onHeight(group.bucket, e[0].contentRect.height))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [group.bucket, onHeight])

  return (
    <div ref={ref} data-bucket={group.bucket}>
      {items ? children : (
        <>
          <div style={{
            position: 'sticky', top: 64, zIndex: 3, background: C.bg,
            margin: '0 -6px', padding: '16px 6px 8px',
            fontSize: 14, fontWeight: 500,
          }}>
            {group.label}{' '}
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>
              {group.count}
            </span>
          </div>
          <PlaceholderRows count={group.count} width={width} rowHeight={rowHeight} />
        </>
      )}
    </div>
  )
}

/**
 * Floating date, shown while scrolling.
 *
 * Group headers are sticky within their own group, so there is nothing pinned
 * between two groups — and at speed the rendered window lags the scroll, so you
 * can be looking at spacers that carry no header at all. Knowing where you are
 * is the whole point of scrolling fast, so this reads straight from the
 * timeline's scroll maths and needs nothing rendered to be right.
 */
function ScrollDate({ label }) {
  const [visible, setVisible] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      setVisible(true)
      clearTimeout(timer.current)
      // Fades once you stop; it's an aid while moving, not furniture.
      timer.current = setTimeout(() => setVisible(false), 900)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(timer.current) }
  }, [])

  if (!label) return null
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', top: 84, right: 24, zIndex: 30,
        padding: '8px 16px', borderRadius: 20,
        background: 'rgba(32,33,36,.92)', color: '#fff',
        fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    >
      {label}
    </div>
  )
}


export function VirtualMediaGrid({
  buckets,                 // from /gallery/counts
  params = '',             // the same query string the counts were fetched with
  onVisibleDateChange,
  scrollToRef,             // filled with a scrollToDate(bucket) function
  ...gridProps
}) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(e => setWidth(Math.floor(e[0].contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  // 8.6 million pixels of timeline; ordinary scrolling cannot cross it.
  useAcceleratedScroll()

  const rowHeight = rowHeightFor(width)

  // The undated section sits above the timeline and is always rendered — it is
  // small, and it acts as a to-do list. Its height offsets every date bucket.
  const undatedRef = useRef(null)
  const [undatedH, setUndatedH] = useState(0)
  useLayoutEffect(() => {
    if (!undatedRef.current) return
    const ro = new ResizeObserver(e => setUndatedH(e[0].contentRect.height))
    ro.observe(undatedRef.current)
    return () => ro.disconnect()
  }, [])

  const timeline = useTimeline({
    buckets, width, rowHeight, gap: GAP, startOffset: undatedH,
  })
  const { itemsByBucket, ensure } = useRangeLoader({ params })

  // Fetch whatever is near the viewport. Each month is asked for once.
  useEffect(() => { ensure(timeline.visible) }, [timeline.visible, ensure])

  // Tell the layer above which month is on screen, for the scrubber.
  useEffect(() => {
    onVisibleDateChange?.(timeline.currentBucket)
  }, [timeline.currentBucket, onVisibleDateChange])

  // Hand the scrubber a way to jump. Instant because the offset is already
  // known — no need to have loaded anything in between.
  useEffect(() => {
    if (!scrollToRef) return
    scrollToRef.current = bucket => {
      const top = timeline.offsetOf(bucket)
      if (top != null) window.scrollTo({ top, behavior: 'auto' })
    }
  }, [scrollToRef, timeline])

  const first = timeline.visible[0]
  const last = timeline.visible[timeline.visible.length - 1]

  const currentLabel = timeline.groups
    .find(g => g.bucket === timeline.currentBucket)?.label

  return (
    <div ref={ref}>
      <ScrollDate label={currentLabel} />

      {/* Undated media, above the timeline. It has no honest place among dated
          photographs, but hidden entirely it never gets fixed. */}
      <div ref={undatedRef}>
        {gridProps.undatedItems?.length > 0 && (
          <MediaGrid {...gridProps} items={[]} />
        )}
      </div>

      {/* Everything above the window, as one empty box of exactly the right
          height. */}
      {first && <div style={{ height: Math.max(0, first.top - undatedH) }} aria-hidden="true" />}

      {timeline.visible.map(g => {
        const items = itemsByBucket[g.bucket]
        return (
          <Group
            key={g.bucket}
            group={g}
            items={items}
            width={width}
            rowHeight={rowHeight}
            onHeight={timeline.reportHeight}
          >
            {/* MediaGrid derives its own labels — and must, because the
                current month splits into day groups and a single month label
                would be stamped on every one of them. */}
            {items && (
              <MediaGrid
                {...gridProps}
                items={items}
                showUndatedSection={false}
              />
            )}
          </Group>
        )
      })}

      {/* And everything below it. */}
      {last && (
        <div
          style={{ height: Math.max(0, timeline.totalHeight - (last.top + last.height)) }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
