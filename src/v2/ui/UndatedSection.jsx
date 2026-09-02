import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { MediaGrid } from './MediaGrid'
import { C } from './tokens'

/**
 * Media with no date, collapsed to a heading.
 *
 * It has no honest place in a timeline — a photograph without a date sitting
 * between 2019 and 2020 is a claim about when it happened. But hidden entirely
 * it never gets fixed, so it sits at the top as a to-do list: a count, and a
 * way in when you feel like doing something about it.
 */
export function UndatedSection({ items, ...gridProps }) {
  const [open, setOpen] = useState(false)
  if (!items?.length) return null

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', textAlign: 'left',
          border: 0, background: 'transparent', cursor: 'pointer',
          padding: '14px 0 8px', fontSize: 14, fontWeight: 500, color: C.text,
        }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Undated
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>
          {items.length}
        </span>
      </button>

      {open && <MediaGrid {...gridProps} items={items} showUndatedSection={false} />}
    </section>
  )
}
