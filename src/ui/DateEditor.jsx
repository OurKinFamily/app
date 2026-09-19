import { useState } from 'react'
import { C } from './tokens'

/**
 * Correcting when a photograph was taken.
 *
 * Precision is the point, not a detail. Half this archive is scans and old
 * film where the honest answer is "1987" or "sometime that summer" — and
 * recording that as 1 January 1987 at midnight is a lie that later looks like
 * a fact. The dropdown lets the record say how much is actually known.
 *
 * Writes are soft: the API keeps the original timestamp and marks the node
 * `timestamp_source = 'manual'`, which mpp is required to honour on re-import,
 * so a correction survives the file being processed again.
 */

const PRECISIONS = [
  { value: 'day',   label: 'Exact day' },
  { value: 'month', label: 'Month only' },
  { value: 'year',  label: 'Year only' },
]

export function DateEditor({ value, precision = 'day', onSave, onCancel }) {
  const iso = value ? new Date(value).toISOString().slice(0, 10) : ''
  const [date, setDate] = useState(iso)
  const [prec, setPrec] = useState(precision)
  const [saving, setSaving] = useState(false)
  const [focused, setFocused] = useState(null)

  // The field asks for exactly as much as the precision claims: a day picker,
  // a month picker, or a year. Asking for a day you do not know is the whole
  // problem precision exists to avoid — and a half-filled date field invites
  // somebody to guess.
  const LEN = { day: 10, month: 7, year: 4 }
  const trimmed = date.slice(0, LEN[prec])

  const changePrecision = next => {
    setPrec(next)
    // Widening keeps what is known and lets the rest be filled back in;
    // narrowing simply drops the part no longer being claimed.
    setDate(prev => (LEN[next] > prev.length ? iso.slice(0, LEN[next]) || prev : prev))
  }

  const submit = async e => {
    e.preventDefault()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      // Pad back out to a full timestamp — the archive stores one date and a
      // precision beside it, so "1987" becomes 1987-01-01 marked as year-only
      // rather than pretending to be new year's day.
      const full = prec === 'year' ? `${trimmed}-01-01`
        : prec === 'month' ? `${trimmed}-01`
        : trimmed
      // Midday, not midnight: a date-only value at 00:00 can slip to the
      // previous day once a timezone is applied, and an archive that quietly
      // shifts dates by one is worse than one that never edits them.
      await onSave?.({ timestamp: `${full}T12:00:00`, precision: prec })
    } finally {
      setSaving(false)
    }
  }

  // The native outline is suppressed for a consistent look, so a replacement
  // has to be drawn — a field you cannot see the focus on is unusable by
  // keyboard, and suppressing the ring without replacing it is the single most
  // common way that happens.
  const field = name => ({
    width: '100%', boxSizing: 'border-box',
    border: `1px solid ${focused === name ? C.activeText : C.border}`,
    borderRadius: 4,
    padding: '6px 8px', fontSize: 13, color: C.text,
    background: C.bg, outline: 'none',
    boxShadow: focused === name ? `0 0 0 2px ${C.activeBg}` : undefined,
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
  })

  const focusProps = name => ({
    onFocus: () => setFocused(name),
    onBlur: () => setFocused(null),
  })

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8, padding: '4px 0 10px' }}>
      {prec === 'year' ? (
        <input
          type="number"
          min="1800"
          max={new Date().getFullYear()}
          placeholder="YYYY"
          value={trimmed}
          onChange={e => setDate(e.target.value)}
          style={field('date')}
          {...focusProps('date')}
          autoFocus
          aria-label="Year taken"
        />
      ) : (
        <input
          type={prec === 'month' ? 'month' : 'date'}
          value={trimmed}
          onChange={e => setDate(e.target.value)}
          style={field('date')}
          {...focusProps('date')}
          autoFocus
          aria-label={prec === 'month' ? 'Month taken' : 'Date taken'}
        />
      )}

      <select
        value={prec}
        onChange={e => changePrecision(e.target.value)}
        style={field('precision')}
        {...focusProps('precision')}
        aria-label="How precisely this is known"
      >
        {PRECISIONS.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>


      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 30, padding: '0 12px', borderRadius: 15, border: 0,
            background: 'transparent', color: C.muted,
            fontSize: 13, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!trimmed || saving}
          style={{
            height: 30, padding: '0 16px', borderRadius: 15, border: 0,
            background: C.activeBg, color: C.activeText,
            fontSize: 13, fontWeight: 500,
            cursor: trimmed && !saving ? 'pointer' : 'default',
            opacity: trimmed && !saving ? 1 : 0.5,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
