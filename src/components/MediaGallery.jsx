import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { Media } from './Media'
import { DateScrubber } from './DateScrubber'
import { computeRows } from '../lib/justifiedRows'
import { formatDay, groupByDay, citiesFor } from '../lib/galleryGrouping'

const DAY_MS = 86400 * 1000


// Justified-rows gallery, grouped by day with a section header per group.
// Optional features:
//  - onLoadOlder(skipMs):  when present, install a window scroll listener that
//      pages older content near the bottom, escalating skipMs by scroll velocity
//      so a long flick skips months/years/decade at a time.
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

  // Bottom-edge loader with velocity-band skip-ahead.
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
      if (y + window.innerHeight > doc.scrollHeight - 600) {
        const v = velocityRef.current.v
        const skipMs = v > 30000 ? 10 * 365 * DAY_MS
          : v > 15000 ? 365 * DAY_MS
          : v > 5000 ? 30 * DAY_MS
          : 0
        onLoadOlder(skipMs)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onLoadOlder])

  // Gap-fill on dwell: when scroll settles, look for any gap-placeholder tiles
  // currently in viewport and ask onFillGap to fetch their range. Each unique
  // (from,to) range is requested at most once (the fill side dedupes too).
  useEffect(() => {
    if (!onFillGap) return
    let timer
    const checkGaps = () => {
      const els = document.querySelectorAll('[data-gap-from]')
      const seen = new Set()
      for (const el of els) {
        const r = el.getBoundingClientRect()
        if (r.bottom <= 0 || r.top >= window.innerHeight) continue
        const k = `${el.dataset.gapFrom}|${el.dataset.gapTo}`
        if (seen.has(k)) continue
        seen.add(k)
        onFillGap({ from: el.dataset.gapFrom, to: el.dataset.gapTo })
      }
    }
    const onScroll = () => {
      clearTimeout(timer)
      timer = setTimeout(checkGaps, 500)
    }
    checkGaps()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(timer) }
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
