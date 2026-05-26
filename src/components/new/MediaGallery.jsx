import { useRef, useState, useLayoutEffect } from 'react'
import { Media } from './Media'
import { computeRows } from '../../lib/justifiedRows'

// Justified-rows gallery (Flickr/Google-Photos style): each row scales to fill the
// width exactly, tiles sized to their true aspect ratio. Layout only.
export function MediaGallery({ items, onSelect, favorites, onFavorite, rowHeight = 200, gap = 4 }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(e => setWidth(Math.floor(e[0].contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const rows = computeRows(items, width, { rowHeight, gap })

  return (
    <div ref={ref} className="w-full" style={{ display: 'flex', flexDirection: 'column', gap }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap, height: row.height }}>
          {row.items.map(item => (
            <div
              key={item.path}
              data-year={item.timestamp ? new Date(item.timestamp).getFullYear() : undefined}
              style={{ flex: row.last ? `0 0 ${Math.round(item.aspect * row.height)}px` : `${item.aspect} 1 0` }}
            >
              <Media
                thumb={item.thumbnail_url}
                isVideo={item.is_video}
                color={item.dominant_color}
                favorited={favorites?.has(item.path)}
                onFavorite={onFavorite ? () => onFavorite(item) : undefined}
                onClick={onSelect ? () => onSelect(item) : undefined}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
