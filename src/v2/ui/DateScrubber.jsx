import { useEffect, useMemo, useRef, useState } from 'react'
import { C } from './tokens'

/**
 * The way to somewhere far away.
 *
 * The gallery loads forwards from wherever you are, so there is no scrollbar
 * spanning the whole archive to drag — and there shouldn't be. A scrollbar over
 * 151,689 photographs is a lie about distance: it says a decade is two
 * centimetres and every pixel is four hundred pictures.
 *
 * This says where things are instead. Years are always there; rest on one and
 * its months open IN PLACE, pushing the years below it down. A flyout beside
 * the rail was quicker to reach but read as a separate menu — expanding in
 * place keeps it one list, and the months are plainly part of the year they
 * belong to.
 *
 * The delay matters. Opening on contact means the rail rearranges itself under
 * anyone crossing it on the way to something else.
 */

const OPEN_DELAY_MS = 450

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function DateScrubber({ buckets, current, onJump }) {
  const [openYear, setOpenYear] = useState(null)
  const [over, setOver] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

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

  const hoverYear = year => {
    clearTimeout(timer.current)
    // Already open elsewhere: switch straight away. The wait is for deciding
    // to open at all, not for moving between years once you are reading.
    if (openYear && openYear !== year) { setOpenYear(year); return }
    timer.current = setTimeout(() => setOpenYear(year), OPEN_DELAY_MS)
  }

  return (
    <nav
      aria-label="Jump to a date"
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => {
        clearTimeout(timer.current)
        setOpenYear(null)
        setOver(false)
      }}
      style={{
        // Starts below the page title row and its Select button, which the
        // rail used to run into.
        position: 'fixed', top: 112, right: 8, zIndex: 15,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        gap: 1, maxHeight: 'calc(100vh - 145px)', overflowY: 'auto',
        // No scrollbar of its own: the rail is the navigation.
        scrollbarWidth: 'none',
        padding: '8px 6px',
        // At rest the years float over the photographs, which is quiet but
        // hard to read against a bright one. Reaching for the rail brings a
        // ground with it.
        borderRadius: 14,
        background: over ? 'rgba(32,33,36,.9)' : 'transparent',
        backdropFilter: over ? 'blur(3px)' : 'none',
        transition: 'background 140ms ease',
      }}
    >
      {years.map(y => {
        const isCurrent = y.year === currentYear
        const isOpen = openYear === y.year
        return (
          <div
            key={y.year}
            onMouseEnter={() => hoverYear(y.year)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}
          >
            <button
              type="button"
              onClick={() => onJump?.(y.months[0].bucket)}
              title={`${y.count} photos`}
              style={{
                border: 0, cursor: 'pointer',
                background: isCurrent ? C.activeText : 'transparent',
                color: isCurrent ? '#fff' : (over ? 'rgba(255,255,255,.88)' : C.muted),
                // Unreadable over a dark photograph without something behind
                // it, and there is no ground until the rail is hovered.
                textShadow: over ? 'none' : '0 1px 2px rgba(255,255,255,.75)',
                borderRadius: 10, padding: '2px 8px',
                fontSize: 11.5, fontWeight: isCurrent || isOpen ? 600 : 400,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {y.year}
            </button>

            {/* In place, between this year and the next, so the list stays one
                list and the months are visibly part of their year. */}
            {isOpen && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                gap: 1, padding: '2px 0 4px',
              }}>
                {y.months.map(m => (
                  <button
                    key={m.bucket}
                    type="button"
                    title={`${m.count} photos`}
                    onClick={() => onJump?.(m.bucket)}
                    style={{
                      border: 0, cursor: 'pointer',
                      background: m.bucket === current ? C.activeBg : 'transparent',
                      color: m.bucket === current ? C.activeText : 'rgba(255,255,255,.7)',
                      borderRadius: 8, padding: '1px 8px',
                      fontSize: 10.5, lineHeight: 1.5,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {MONTHS[Number(m.bucket.slice(5, 7)) - 1]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
