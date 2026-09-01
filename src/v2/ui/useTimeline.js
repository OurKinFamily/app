import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Timeline layout for a virtualised grid.
 *
 * The grid has to be the right height before it has any photographs, or the
 * scrollbar lies and the date scrubber can't jump anywhere. It gets there from
 * /gallery/counts: one row per month, from which each group's height is
 * estimated as
 *
 *     rows  = ceil(count / itemsPerRow)
 *     height = rows * (rowHeight + gap) + headerHeight
 *
 * The estimate is deliberately crude. It only has to be close enough that the
 * scrollbar feels honest; once a group has actually rendered, its measured
 * height replaces the guess and never reverts.
 *
 * Virtualisation is per GROUP, not per row. A month is a few hundred photos —
 * cheap to render in one go — and only two or three months are ever near the
 * viewport. Row-level windowing would buy little and cost a great deal of
 * fiddly offset arithmetic.
 */

// Most of the archive is 4:3 or 16:9 landscape, so a row holds roughly this
// many. Wrong for a month of portraits, which is what measurement is for.
const ASSUMED_ASPECT = 1.45

// How far beyond the viewport to keep rendered. Generous: re-rendering a month
// is cheap, and an empty screen while scrolling is the thing to avoid.
const OVERSCAN_PX = 1200

export function useTimeline({ buckets, width, rowHeight, gap = 4, headerHeight = 44 }) {
  const [scrollY, setScrollY] = useState(0)
  const [viewportH, setViewportH] = useState(
    typeof window === 'undefined' ? 800 : window.innerHeight,
  )
  // Heights we've actually seen. State rather than a ref: the layout below is
  // derived from it during render, and a ref read during render is not a
  // dependency React can track. Kept even when a group scrolls away, or the
  // page would resize under the reader every time one unmounted.
  const [measured, setMeasured] = useState(() => new Map())

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    const onResize = () => setViewportH(window.innerHeight)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const itemsPerRow = Math.max(1, Math.floor(width / (rowHeight * ASSUMED_ASPECT)) || 1)

  // Absolute offsets for every group, measured where possible.
  const layout = useMemo(() => {
    // Reduce rather than map-with-a-running-total: the lint rule is right that
    // reassigning a captured variable while building derived state is a trap.
    const groups = (buckets || []).reduce((acc, b) => {
      const known = measured.get(b.bucket)
      const rows = Math.max(1, Math.ceil(b.count / itemsPerRow))
      const height = known ?? rows * (rowHeight + gap) + headerHeight
      const prev = acc[acc.length - 1]
      const top = prev ? prev.top + prev.height : 0
      acc.push({ ...b, top, height, estimated: known == null })
      return acc
    }, [])
    const last = groups[groups.length - 1]
    return { groups, totalHeight: last ? last.top + last.height : 0 }
  }, [buckets, itemsPerRow, rowHeight, gap, headerHeight, measured])

  const visible = useMemo(() => {
    const from = scrollY - OVERSCAN_PX
    const to = scrollY + viewportH + OVERSCAN_PX
    return layout.groups.filter(g => g.top + g.height >= from && g.top <= to)
  }, [layout, scrollY, viewportH])

  /** Record what a group really measured, so its estimate stops being used. */
  const reportHeight = useCallback((bucket, height) => {
    if (!height) return
    setMeasured(prev => {
      const known = prev.get(bucket)
      // Ignore sub-pixel noise, or measuring re-lays out which re-measures,
      // for ever.
      if (known != null && Math.abs(known - height) < 2) return prev
      const next = new Map(prev)
      next.set(bucket, height)
      return next
    })
  }, [])

  /** Where a bucket starts, for the scrubber to jump to. */
  const offsetOf = useCallback(
    bucket => layout.groups.find(g => g.bucket === bucket)?.top ?? null,
    [layout],
  )

  /** Which bucket is at the top of the viewport right now. */
  const currentBucket = useMemo(() => {
    const y = scrollY + 1
    for (const g of layout.groups) {
      if (y >= g.top && y < g.top + g.height) return g.bucket
    }
    return layout.groups[0]?.bucket ?? null
  }, [layout, scrollY])

  return {
    groups: layout.groups,
    totalHeight: layout.totalHeight,
    visible,
    reportHeight,
    offsetOf,
    currentBucket,
  }
}
