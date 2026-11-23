import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { C } from './tokens'
import { kindBadge } from '../lib/albumKind'

/**
 * What kind of album this is — holiday, trip, birthday and so on.
 *
 * The field has existed since albums did, the colours have existed in
 * albumKind.js, and the Albums page already filters by it. Nothing ever let
 * you set it: 245 of 247 albums got their kind from the generator that made
 * them, and the two made by hand were stuck on nothing at all.
 *
 * A fixed list rather than free text, because the api enforces one — the
 * point is that "Trip", "trips" and "Travel" cannot all exist and mean the
 * same thing.
 *
 * It reads as the badge it already is, and opens into the same badges. There
 * is no separate "edit" state: the thing you look at is the thing you click.
 */

// The api's ALBUM_KINDS, in the order they make sense to a person rather
// than alphabetically. `manual` means nobody has said, so it goes last.
const KINDS = ['holiday', 'trip', 'journey', 'birthday', 'big_day',
               'sporting_event', 'manual']

export function AlbumKindPicker({ kind, onChange, canEdit = true }) {
  const [open, setOpen] = useState(false)
  const current = kindBadge(kind)

  if (!canEdit) {
    return <Badge badge={current} />
  }

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Album type: ${current.label}. Change it.`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          border: 'none', cursor: 'pointer', padding: 0,
          background: 'transparent', font: 'inherit',
        }}
      >
        <Badge badge={current} />
        <ChevronDown size={13} color={C.muted} />
      </button>

      {open && (
        <>
          {/* Catches the next click anywhere else. Without it the only way to
              dismiss the list is to pick something, which makes opening it by
              accident a decision you cannot take back. */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              border: 'none', background: 'transparent', cursor: 'default',
            }}
          />
          <ul
            role="listbox"
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 41,
              margin: 0, padding: 6, listStyle: 'none', minWidth: 150,
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,.12)',
            }}
          >
            {KINDS.map(k => {
              const badge = kindBadge(k)
              const on = (kind || 'manual') === k
              return (
                <li key={k}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => { setOpen(false); if (!on) onChange(k) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '6px 8px', border: 'none', borderRadius: 6,
                      background: 'transparent', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.hover }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <Badge badge={badge} />
                    <span style={{ flex: 1 }} />
                    {on && <Check size={14} color={C.activeText} />}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </span>
  )
}

function Badge({ badge }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 999,
      fontSize: 12, fontWeight: 500,
      color: badge.fg, background: badge.bg,
    }}>
      {badge.label}
    </span>
  )
}
