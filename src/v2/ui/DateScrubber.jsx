import { useMemo, useState } from 'react'
import { C } from './tokens'

/**
 * The way to somewhere far away.
 *
 * The gallery loads forwards from wherever you are, so there is no scrollbar
 * spanning the whole archive to drag — and there shouldn't be. A scrollbar over
 * 151,689 photographs is a lie about distance: it says a decade is two
 * centimetres and every pixel is four hundred pictures.
 *
 * This says where things are instead. Years are always visible; hovering one
 * opens its months. Clicking either fetches that point directly, which costs
 * one request whether it is last week or 2009.
 */
export function DateScrubber({ buckets, current, onJump }) {
  const [openYear, setOpenYear] = useState(null)

  // Buckets arrive newest-first as "YYYY-MM"; group them under their year.
  const years = useMemo(() => {
    const byYear = new Map()
    for (const b of buckets || []) {
      const y = b.bucket.slice(0, 4)
      if (!byYear.has(y)) byYear.set(y, { year: y, count: 0, months: [] })
      const entry = byYear.get(y)
      entry.count += b.count
      entry.months.push(b)
    }
    return [...byYear.values()]
  }, [buckets])

  if (!years.length) return null

  const currentYear = current?.slice(0, 4)

  return (
    <nav
      aria-label="Jump to a date"
      onMouseLeave={() => setOpenYear(null)}
      style={{
        position: 'fixed', top: 96, right: 8, zIndex: 15,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        gap: 1, maxHeight: 'calc(100vh - 130px)', overflowY: 'auto',
        // No scrollbar of its own: the rail is the navigation.
        scrollbarWidth: 'none',
        padding: '4px 2px',
      }}
    >
      {years.map(y => {
        const isCurrent = y.year === currentYear
        const isOpen = openYear === y.year
        return (
          <div
            key={y.year}
            onMouseEnter={() => setOpenYear(y.year)}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {/* Months appear to the LEFT of the year, so the rail itself never
                moves and the year you are pointing at stays under the cursor. */}
            {isOpen && (
              <div style={{
                display: 'flex', gap: 2,
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '3px 6px',
                boxShadow: '0 4px 14px rgba(0,0,0,.12)',
              }}>
                {y.months.slice().reverse().map(m => (
                  <button
                    key={m.bucket}
                    type="button"
                    title={`${m.count} photos`}
                    onClick={() => onJump?.(m.bucket)}
                    style={{
                      border: 0, background: m.bucket === current ? C.activeBg : 'transparent',
                      color: m.bucket === current ? C.activeText : C.muted,
                      borderRadius: 9, padding: '2px 6px',
                      fontSize: 10.5, cursor: 'pointer', lineHeight: 1.6,
                    }}
                  >
                    {MONTHS[Number(m.bucket.slice(5, 7)) - 1]}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => onJump?.(y.months[0].bucket)}
              title={`${y.count} photos`}
              style={{
                border: 0, cursor: 'pointer',
                background: isCurrent ? C.activeText : 'transparent',
                color: isCurrent ? '#fff' : C.muted,
                borderRadius: 10, padding: '1px 8px',
                fontSize: 11, fontWeight: isCurrent ? 600 : 400,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {y.year}
            </button>
          </div>
        )
      })}
    </nav>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
