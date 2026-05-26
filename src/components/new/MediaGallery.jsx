import { useRef, useState, useLayoutEffect } from 'react'
import { Media } from './Media'
import { computeRows } from '../../lib/justifiedRows'

function formatDay(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function groupByDay(items) {
  const map = new Map()
  for (const it of items) {
    const day = it.timestamp ? it.timestamp.slice(0, 10) : '__unknown'
    if (!map.has(day)) map.set(day, [])
    map.get(day).push(it)
  }
  return [...map.entries()].map(([day, items]) => ({ day, items }))
}

function citiesFor(items) {
  const set = new Set()
  for (const it of items) {
    const c = it.city || it.place_name
    if (c) set.add(c)
  }
  return [...set]
}


// Justified-rows gallery, grouped by day with a section header per group.
// Gap items (item.__gap === true) render as gray placeholders, no interactions.
export function MediaGallery({ items, onSelect, favorites, onFavorite, rowHeight = 200, gap = 4 }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(e => setWidth(Math.floor(e[0].contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const groups = groupByDay(items)

  return (
    <div ref={ref} className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map(group => {
        const rows = computeRows(group.items, width, { rowHeight, gap })
        const showHeader = group.day !== '__unknown'
        const cities = citiesFor(group.items)
        return (
          <section key={group.day}>
            {showHeader && (
              <h3 className="sticky top-12 z-10 mb-2 bg-[#0f0f0f] py-2 text-[13px] font-medium text-white/75">
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
                      data-year={item.timestamp ? new Date(item.timestamp).getFullYear() : undefined}
                      style={{ flex: row.last ? `0 0 ${Math.round(item.aspect * row.height)}px` : `${item.aspect} 1 0` }}
                    >
                      <Media
                        thumb={item.__gap ? null : item.thumbnail_url}
                        isVideo={!item.__gap && item.is_video}
                        color={item.dominant_color}
                        favorited={!item.__gap && favorites?.has(item.path)}
                        onFavorite={item.__gap || !onFavorite ? undefined : () => onFavorite(item)}
                        onClick={item.__gap || !onSelect ? undefined : () => onSelect(item)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
