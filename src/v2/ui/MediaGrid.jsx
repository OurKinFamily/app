import { useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react'
import { computeRows } from '../../lib/justifiedRows'
import { MediaTile } from './MediaTile'
import { mediaTileProps, formatDuration } from './mediaTileProps'
import { C } from './tokens'

/**
 * The justified photo grid.
 *
 * Presentational: it takes items and reports intent. It never fetches, and it
 * never owns the selection — an album, a person's photos and a search result
 * all have different sources, and selection almost always drives something
 * outside the grid (a count in the header, a delete action).
 *
 * Layout comes from `computeRows` in src/lib, which v1 already uses and which
 * is covered by the test gate: pack by aspect ratio, then scale each row so it
 * fills the width exactly. The last row of a group keeps its natural height
 * rather than stretching — two photos blown across 1400px look absurd.
 *
 * NOT yet virtualised. Every loaded row is in the DOM, which is fine for a few
 * hundred and fatal for 150,000. Virtualisation needs a counts endpoint to
 * estimate total height before the photos exist; until then this pages.
 */

// Google Photos' rough proportions: keep three or four photos across at any
// width rather than letting a phone become a single column of huge pictures.
function rowHeightFor(width) {
  if (width < 500) return 120
  if (width < 900) return 180
  return 220
}

const GAP = 4

// mpp records video dimensions as 0x0, so the API sends none and computeRows
// falls back to its 4:3 default — wrong for nearly all phone video. 16:9 is the
// better guess until the dimensions are real (see the video-metadata issue).
const VIDEO_ASPECT = 16 / 9

const MONTH_FMT = { month: 'long', year: 'numeric' }
const DAY_FMT = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }

/**
 * Current month by day, everything older by month.
 *
 * A day in 2009 often holds one photo, so day-grouping the whole archive would
 * be mostly headers. The current month is where you shoot a lot per day and
 * where the distinction earns its keep.
 */
function groupItems(items, now = new Date()) {
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const undated = []
  const buckets = new Map()

  for (const it of items) {
    if (!it.timestamp) { undated.push(it); continue }
    const ym = it.timestamp.slice(0, 7)
    const key = ym === thisMonth ? it.timestamp.slice(0, 10) : ym
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(it)
  }

  const groups = [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))     // newest first
    .map(([key, groupItems_]) => ({
      key,
      label: key.length === 10
        ? new Date(key + 'T00:00:00').toLocaleDateString(undefined, DAY_FMT)
        : new Date(key + '-01T00:00:00').toLocaleDateString(undefined, MONTH_FMT),
      items: groupItems_,
    }))

  return { undated, groups }
}

/** The places a group's photos were taken, most common first. */
function topPlaces(items, limit = 3) {
  const counts = new Map()
  for (const it of items) {
    const place = it.city || it.place_name
    if (!place) continue
    counts.set(place, (counts.get(place) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([place]) => place)
}


function Header({ children, count, places }) {
  return (
    <div
      style={{
        position: 'sticky',
        // Sits below the app header, which is 64px and also sticky.
        top: 64,
        zIndex: 3,
        background: C.bg,
        padding: '16px 0 8px',
        fontSize: 14,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
      }}
    >
      {children}
      {count != null && (
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>{count}</span>
      )}
      {places?.length > 0 && (
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>
          · {places.join(', ')}
        </span>
      )}
    </div>
  )
}

export function MediaGrid({
  items = [],
  undatedItems = [],
  selected,                    // Set of paths; the page owns it
  onSelectionChange,
  selectionMode = false,
  onRequestSelectionMode,
  favourites,
  onToggleFavourite,
  onOpen,
}) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  const [showUndated, setShowUndated] = useState(false)
  // Where the last plain selection happened, so shift-click knows what a range
  // means. Only the grid can answer that — it owns the order.
  const anchorRef = useRef(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(e => setWidth(Math.floor(e[0].contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const rowHeight = rowHeightFor(width)
  const withAspect = useMemo(
    () => items.map(it =>
      (!it.width || !it.height) && it.is_video
        ? { ...it, width: VIDEO_ASPECT * 1000, height: 1000 }
        : it),
    [items],
  )
  const { groups } = useMemo(() => groupItems(withAspect), [withAspect])

  const isSelected = useCallback(p => !!selected?.has(p), [selected])

  // Flat order of everything on screen. Shift-click ranges are defined against
  // this, not against the raw items array — the user means "everything between
  // these two as I see them", which includes crossing group boundaries.
  const ordered = useMemo(
    () => groups.flatMap(g => g.items.map(i => i.path)),
    [groups],
  )

  const toggle = useCallback((path, next) => {
    if (!onSelectionChange) return
    const set = new Set(selected || [])
    if (next ?? !set.has(path)) set.add(path)
    else set.delete(path)
    anchorRef.current = path
    onSelectionChange(set)
  }, [selected, onSelectionChange])

  const selectRange = useCallback(path => {
    if (!onSelectionChange) return
    const anchor = anchorRef.current
    // Nothing to range from yet — treat it as an ordinary click.
    if (!anchor || anchor === path) return toggle(path)
    const a = ordered.indexOf(anchor)
    const b = ordered.indexOf(path)
    if (a === -1 || b === -1) return toggle(path)
    const set = new Set(selected || [])
    for (const p of ordered.slice(Math.min(a, b), Math.max(a, b) + 1)) set.add(p)
    // The anchor deliberately stays put, so a second shift-click grows or
    // shrinks the same range rather than starting a new one.
    onSelectionChange(set)
  }, [ordered, selected, onSelectionChange, toggle])

  // Only the first couple of rows should load eagerly; the rest are lazy. A
  // lazy first screen puts a round trip after layout and delays the largest
  // contentful paint on every load.
  let rowsRendered = 0

  const renderRow = (row, groupKey, i) => {
    rowsRendered += 1
    const priority = rowsRendered <= 2
    return (
      <div key={`${groupKey}-${i}`} style={{ display: 'flex', gap: GAP, marginBottom: GAP }}>
        {row.items.map(item => (
          <div
            key={item.path}
            data-media-path={item.path}
            style={{ width: row.height * item.aspect, height: row.height, flex: '0 0 auto' }}
          >
            <MediaTile
              {...mediaTileProps(item)}
              priority={priority}
              selected={isSelected(item.path)}
              selectionMode={selectionMode}
              onLongPress={onRequestSelectionMode}
              onToggleSelect={next => toggle(item.path, next)}
              onClick={e => {
                // Shift-click selects a range rather than opening — the
                // convention everywhere from Finder to Gmail.
                if (e?.shiftKey) { selectRange(item.path); return }
                onOpen?.(item)
              }}
            >
              <MediaTile.Top justify="space-between">
                {isSelected(item.path)
                  ? <MediaTile.Checkbox checked onChange={() => toggle(item.path, false)} />
                  : <MediaTile.OnHover>
                      <MediaTile.Checkbox onChange={() => toggle(item.path, true)} />
                    </MediaTile.OnHover>}
                {/* A favourited heart stays put: it's state worth seeing
                    across a whole grid, not a control you reach for. */}
                {favourites?.has(item.path)
                  ? <MediaTile.Favourite favourited onChange={() => onToggleFavourite?.(item)} />
                  : <MediaTile.OnHover>
                      <MediaTile.Favourite onChange={() => onToggleFavourite?.(item)} />
                    </MediaTile.OnHover>}
              </MediaTile.Top>
              {item.is_video && formatDuration(item.duration) && (
                <MediaTile.Bottom justify="flex-end">
                  <span style={{
                    color: '#fff', fontSize: 12, fontWeight: 500,
                    textShadow: '0 1px 2px rgba(0,0,0,.6)',
                  }}>
                    {formatDuration(item.duration)}
                  </span>
                </MediaTile.Bottom>
              )}
            </MediaTile>
          </div>
        ))}
      </div>
    )
  }

  // `x` selects the focused tile — Gmail and GitHub both use it, and `s` is
  // left free for starring. Selection is the one action repeated across
  // hundreds of photos, so it should cost one key, not three.
  const onKeyDown = useCallback(e => {
    if (e.key !== 'x' || e.metaKey || e.ctrlKey || e.altKey) return
    // Never steal a keystroke from a text field, or typing "taxi" in search
    // would start selecting photos.
    const t = e.target
    if (t.matches?.('input, textarea, select, [contenteditable]')) return
    const wrapper = t.closest?.('[data-media-path]')
    if (!wrapper) return
    e.preventDefault()
    toggle(wrapper.getAttribute('data-media-path'))
  }, [toggle])

  return (
    <div ref={ref} onKeyDown={onKeyDown}>
      {/* Undated first, collapsed. They have no honest place in a timeline —
          a photo with no date sitting between 2019 and 2020 is a lie about
          when it happened — but hiding them entirely means they never get
          fixed. A collapsed row costs nothing and acts as a to-do. */}
      {undatedItems.length > 0 && (
        <section>
          <Header count={undatedItems.length}>Undated</Header>
          {width > 0 && computeRows(
            showUndated ? undatedItems : undatedItems.slice(0, 12),
            width, { rowHeight, gap: GAP },
          ).slice(0, showUndated ? Infinity : 1).map((r, i) => renderRow(r, 'undated', i))}
          <button
            type="button"
            onClick={() => setShowUndated(v => !v)}
            style={{
              border: 0, background: 'transparent', color: C.activeText,
              fontSize: 13, cursor: 'pointer', padding: '8px 0 16px',
            }}
          >
            {showUndated ? 'Show less' : `Show all ${undatedItems.length}`}
          </button>
        </section>
      )}

      {width > 0 && groups.map(g => (
        <section key={g.key}>
          <Header count={g.items.length} places={topPlaces(g.items)}>{g.label}</Header>
          {computeRows(g.items, width, { rowHeight, gap: GAP })
            .map((row, i) => renderRow(row, g.key, i))}
        </section>
      ))}
    </div>
  )
}
