import { memo, useState } from 'react'
import { Avatar } from './Avatar'
import { C } from './tokens'

/**
 * One person as a row: a small table, really.
 *
 * The grid view shows a face and a name, which is what you want when you are
 * looking for somebody. This is for the other question — how much do we
 * actually have on these people — so it gives the columns the grid cannot: how
 * many photographs, when they were born, when they passed, where they were
 * from.
 *
 * Columns are a CSS grid on the row itself rather than a <table>, so the
 * header and the rows stay in step while each row remains one button.
 */

export const COLUMNS = '1fr 96px 96px 1fr 88px'

export function PersonRowHeader() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'grid', gridTemplateColumns: COLUMNS, gap: 12,
        padding: '0 10px 6px', borderBottom: `1px solid ${C.border}`,
        fontSize: 11.5, color: C.muted, letterSpacing: '.02em',
      }}
    >
      <span>Name</span>
      <span>Born</span>
      <span>Passed</span>
      <span>From</span>
      <span style={{ textAlign: 'right' }}>Photos</span>
    </div>
  )
}

function PersonRowBase({ person, name, secondary, avatar, onClick }) {
  // Rows are close together and span the width of the page, so the hover has
  // to say which one the pointer is on without turning the list into stripes.
  // Barely-there grey does it; anything stronger reads as selection.
  const [lit, setLit] = useState(false)
  const born = year(person.birth_date)
  const died = year(person.death_date)
  const count = person.photo_count

  return (
    <button
      type="button"
      data-testid="person-card"
      onClick={onClick}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      // Keyboard focus lights the row too, or arrowing down a list of 523
      // people gives no clue where you are.
      onFocus={e => setLit(e.target.matches(':focus-visible'))}
      onBlur={() => setLit(false)}
      style={{
        display: 'grid', gridTemplateColumns: COLUMNS, gap: 12,
        alignItems: 'center', width: '100%', padding: '7px 10px',
        border: 0, borderRadius: 8, cursor: 'pointer', textAlign: 'left',
        font: 'inherit', color: 'inherit',
        background: lit ? 'rgba(60,64,67,.06)' : 'transparent',
        transition: 'background 90ms ease',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar name={name} src={avatar} size={30} />
        <span style={{ minWidth: 0 }}>
          <span style={{ ...ellipsis, fontSize: 13.5, color: C.text }} title={name}>
            {name}
          </span>
          {secondary && secondary !== `${born} – ${died}` && (
            <span style={{ ...ellipsis, fontSize: 11, color: C.muted }}>
              {secondary}
            </span>
          )}
        </span>
      </span>

      <span style={cell}>{born || dash}</span>
      <span style={cell}>{died || (person.is_living === false ? '—' : dash)}</span>
      <span style={{ ...cell, ...ellipsis }} title={person.birth_place || ''}>
        {person.birth_place || dash}
      </span>
      <span style={{ ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {count == null ? dash : count.toLocaleString()}
      </span>
    </button>
  )
}

const dash = '·'
const cell = { fontSize: 12.5, color: C.muted }
const ellipsis = {
  display: 'block', overflow: 'hidden',
  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const year = d => (typeof d === 'string' && d.length >= 4 ? d.slice(0, 4) : null)

export const PersonRow = memo(PersonRowBase)
