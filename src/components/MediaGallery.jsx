import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { Media } from './Media'
import { DateScrubber } from './DateScrubber'
import { computeRows } from '../lib/justifiedRows'
import { formatDay, groupByDay, citiesFor } from '../lib/galleryGrouping'

const DAY_MS = 86400 * 1000
// Minimum spacing between skips. One flick emits many scroll events; without
// this they each skip again and the gallery overshoots wildly.
const SKIP_COOLDOWN_MS = 900
// Progressive skip: keep flicking and the stride grows. Deliberately NOT keyed
// off instantaneous velocity — that jumped straight to a decade the moment you
// scrolled hard, which overshot by years on a single gesture. Start small,
// build up only if the user keeps going.
const SKIP_LADDER_DAYS = [7, 14, 30, 90, 180, 365, 730, 1825]
// Stop flicking for this long and the stride drops back to the bottom rung.
const SKIP_RESET_MS = 1500
// Below this the user is reading, not travelling — never skip.
const FLICK_PX_PER_SEC = 5000

// Justified-rows gallery, grouped by day with a section header per group.
// Optional features:
//  - onLoadOlder(skipMs):  when present, install a window scroll listener that
//      pages older content near the bottom. A sustained flick skips ahead on a
//      progressive ramp (a week, then a fortnight, then a month…). Skipped
//      ranges are marked with gap tiles and backfilled in full — see onFillGap.
//  - scrubber: { years, anchor, onJump } — when present, render the right-edge
//      DateScrubber and track which year is visible at the top of the viewport.
//
// Gap items (item.__gap === true) render as gray placeholders, no interactions.
export function MediaGallery({
  items, onSelect, favorites, onFavorite, rowHeight = 200, gap = 4,
  onLoadOlder, onFillGap, scrubber,
  selectedPaths, selectionActive = false, onToggleSelect,
}) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  const [currentYear, setCurrentYear] = useState(null)
  const velocityRef = useRef({ y: 0, t: 0, v: 0 })
  // -Infinity, not 0: performance.now() is small right after load, so a 0 seed
  // would swallow the first skip.
  const lastSkipRef = useRef(-Infinity)
  const skipStepRef = useRef(0)

  // Flat index per path so a shift-click can resolve the range against the
  // gallery's real order (the rendered tiles are grouped by day/shelf).
  const indexByPath = new Map(items.map((it, i) => [it.path, i]))
  const selectProps = item => (onToggleSelect && !item.__gap ? {
    selected: !!selectedPaths?.has(item.path),
    selectionActive,
    onToggleSelect: e => onToggleSelect(item, indexByPath.get(item.path), e.shiftKey),
  } : {})

  useLayoutEffect(() => {
    const ro = new ResizeObserver(e => setWidth(Math.floor(e[0].contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  // Bottom-edge loader with a progressive skip-ahead ramp.
  useEffect(() => {
    if (!onLoadOlder) return
    const onScroll = () => {
      // Skip while a modal (lightbox) has locked body scroll — otherwise the
      // shrunken scrollHeight makes the bottom-edge check evaluate true and
      // triggers a runaway loadOlder chain.
      if (document.body.style.position === 'fixed') return
      const now = performance.now()
      const y = window.scrollY
      const dt = now - velocityRef.current.t
      if (dt > 0) velocityRef.current.v = Math.abs(y - velocityRef.current.y) / dt * 1000
      velocityRef.current.y = y
      velocityRef.current.t = now

      const doc = document.documentElement
      const fromEnd = doc.scrollHeight - (y + window.innerHeight)
      // Prefetch a little ahead of the bottom so an ordinary scroll does not
      // stall on empty space. Not too far ahead: with a 48-item page a wide
      // band just means more requests in flight, which reads as slower.
      if (fromEnd > 1200) return

      // ...but only consider SKIPPING at the true bottom edge. These are two
      // different decisions and they must not share a threshold: tying the skip
      // to the wide prefetch band made it fire on almost every scroll event.
      const v = velocityRef.current.v
      let skipMs = 0
      if (fromEnd <= 600) {
        // Idle long enough and the ramp starts over from the smallest stride.
        if (now - lastSkipRef.current > SKIP_RESET_MS) skipStepRef.current = 0
        if (v > FLICK_PX_PER_SEC && now - lastSkipRef.current > SKIP_COOLDOWN_MS) {
          const rung = Math.min(skipStepRef.current, SKIP_LADDER_DAYS.length - 1)
          skipMs = SKIP_LADDER_DAYS[rung] * DAY_MS
          skipStepRef.current = rung + 1
          lastSkipRef.current = now
        }
      }
      onLoadOlder(skipMs)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onLoadOlder])

  // Gap-fill. A skip leaves placeholder tiles standing in for a range that was
  // never fetched; this asks onFillGap to go get it.
  //
  // regression(2026-08-31): this used to wait 500ms for the scroll to SETTLE.
  // A flick — the exact gesture that creates a gap — never settles over the
  // placeholders, so the fill was never requested and the skipped photos were
  // simply absent from the grid. Fire on every scroll instead, and use a tall
  // margin so a gap about to come into view is already being fetched. Repeat
  // calls are cheap: both sides dedupe by range.
  useEffect(() => {
    if (!onFillGap) return
    const checkGaps = () => {
      // Every outstanding gap, regardless of where it sits. Filling only what
      // was near the viewport meant a hard flick — which leaves the gaps far
      // behind — never backfilled them, so those photos stayed unreachable.
      // Each range is fetched once (both sides dedupe), so the cost is bounded
      // by the number of skips, not by scroll events.
      const seen = new Set()
      for (const el of document.querySelectorAll('[data-gap-from]')) {
        const k = `${el.dataset.gapFrom}|${el.dataset.gapTo}`
        if (seen.has(k)) continue
        seen.add(k)
        onFillGap({ from: el.dataset.gapFrom, to: el.dataset.gapTo })
      }
    }
    checkGaps()
    window.addEventListener('scroll', checkGaps, { passive: true })
    return () => window.removeEventListener('scroll', checkGaps)
  }, [onFillGap, items])

  // Track "current year" via topmost element with data-year (used by scrubber).
  useEffect(() => {
    if (!scrubber) return
    const onScroll = () => {
      const els = document.querySelectorAll('[data-year]')
      for (const el of els) {
        const r = el.getBoundingClientRect()
        if (r.bottom > 0) {
          const y = Number(el.getAttribute('data-year'))
          if (y) setCurrentYear(y)
          break
        }
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [scrubber, items])

  const groups = groupByDay(items)

  // Pack consecutive 1-photo days into shared "shelves" so the page doesn't
  // leave half-empty rows when there's only one photo for a day. Multi-photo
  // days keep their own full-width row.
  const shelves = []
  let openShelf = null
  for (const group of groups) {
    const isShort = group.items.length === 1
    if (isShort) {
      if (!openShelf) {
        openShelf = { short: true, days: [] }
        shelves.push(openShelf)
      }
      openShelf.days.push(group)
    } else {
      openShelf = null
      shelves.push({ short: false, day: group })
    }
  }

  return (
    <div ref={ref} data-testid="gallery" className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {shelves.map((shelf, si) => {
        if (shelf.short) {
          // Side-by-side packing — each day renders header + its single photo
          // at rowHeight. flex-wrap kicks in only when the row overflows.
          return (
            <div key={`shelf-${si}`} className="flex flex-wrap" style={{ gap }}>
              {shelf.days.map(group => {
                const item   = group.items[0]
                const cities = citiesFor(group.items)
                const w      = Math.round((item.aspect || 1) * rowHeight)
                return (
                  <section key={group.day} style={{ width: w }}>
                    <h3 className="sticky top-[var(--app-header-h,3rem)] z-10 mb-2 bg-[#0f0f0f] py-2 text-[13px] font-medium text-white/75">
                      {formatDay(group.day)}
                      {cities.length > 0 && (
                        <span className="ml-2 text-white/40">{cities.join(' & ')}</span>
                      )}
                    </h3>
                    <div
                      data-testid={item.__gap ? undefined : 'gallery-item'}
                      data-year={item.timestamp ? new Date(item.timestamp).getFullYear() : undefined}
                      data-gap-from={item.__gap ? item.gapFromTs : undefined}
                      data-gap-to={item.__gap ? item.gapToTs : undefined}
                      style={{ height: rowHeight }}
                    >
                      <Media
                        thumb={item.__gap ? null : item.thumbnail_url}
                        isVideo={!item.__gap && item.is_video}
                        color={item.dominant_color}
                        favorited={!item.__gap && favorites?.has(item.path)}
                        onFavorite={item.__gap || !onFavorite ? undefined : () => onFavorite(item)}
                        onClick={item.__gap || !onSelect ? undefined : () => onSelect(item)}
                        {...selectProps(item)}
                      />
                    </div>
                  </section>
                )
              })}
            </div>
          )
        }

        const group  = shelf.day
        const rows   = computeRows(group.items, width, { rowHeight, gap })
        const showHeader = group.day !== '__unknown'
        const cities = citiesFor(group.items)
        return (
          <section key={group.day}>
            {showHeader && (
              <h3 className="sticky top-[var(--app-header-h,3rem)] z-10 mb-2 bg-[#0f0f0f] py-2 text-[13px] font-medium text-white/75">
                {formatDay(group.day)}
                {cities.length > 0 && (
                  <span className="ml-2 text-white/40">{cities.join(' & ')}</span>
                )}
              </h3>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap }}>
              {rows.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap, height: row.height }}>
                  {row.items.map(item => (
                    <div
                      key={item.path}
                      data-testid={item.__gap ? undefined : 'gallery-item'}
                      data-year={item.timestamp ? new Date(item.timestamp).getFullYear() : undefined}
                      data-gap-from={item.__gap ? item.gapFromTs : undefined}
                      data-gap-to={item.__gap ? item.gapToTs : undefined}
                      style={{ flex: row.last ? `0 0 ${Math.round(item.aspect * row.height)}px` : `${item.aspect} 1 0` }}
                    >
                      <Media
                        thumb={item.__gap ? null : item.thumbnail_url}
                        isVideo={!item.__gap && item.is_video}
                        color={item.dominant_color}
                        favorited={!item.__gap && favorites?.has(item.path)}
                        onFavorite={item.__gap || !onFavorite ? undefined : () => onFavorite(item)}
                        onClick={item.__gap || !onSelect ? undefined : () => onSelect(item)}
                        {...selectProps(item)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {scrubber && (
        <DateScrubber
          years={scrubber.years}
          currentYear={currentYear}
          onJump={scrubber.onJump}
        />
      )}
    </div>
  )
}
