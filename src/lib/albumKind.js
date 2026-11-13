const KINDS = {
  manual:   { label: 'Album',    fg: '#4a4a4a', bg: '#eceae6' },
  holiday:  { label: 'Holiday',  fg: '#8a5a22', bg: '#fdf4e7' },
  trip:     { label: 'Trip',     fg: '#36603c', bg: '#edf6ee' },
  journey:  { label: 'Journey',  fg: '#2f4f7a', bg: '#e9f0fa' },
  birthday: { label: 'Birthday', fg: '#8a3d59', bg: '#fdf0f4' },
  big_day:  { label: 'Big day',  fg: '#5b4a7a', bg: '#f1edf8' },
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December']

/** Colour and label for an album's kind. Unknown or missing reads as a plain album. */
export function kindBadge(kind) {
  return KINDS[kind] || KINDS.manual
}

/** Human label for an album's kind. */
export function kindLabel(kind) {
  return kindBadge(kind).label
}

/**
 * Pull year and month straight out of an ISO timestamp.
 *
 * Deliberately NOT via `new Date`: the archive stores timestamps in UTC, and
 * parsing 2018-01-01T00:00:00Z into a local Date renders it as 31 December in
 * New York. An album would then be filed under the wrong month, and for a
 * Christmas or a New Year that is exactly the month that matters.
 */
function ym(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso ?? ''))
  return m ? { year: +m[1], month: +m[2] - 1 } : null
}

/**
 * When the album happened, from the dates of the photographs in it.
 *
 * Coarse on purpose: the card wants "December 1972", not a range to the day.
 * Albums generated in bulk share a created_at, so that date says nothing and
 * is not used here.
 */
export function albumWhen(first, last) {
  const a = ym(first)
  if (!a) return null
  const b = ym(last)
  if (!b || (b.year === a.year && b.month === a.month)) {
    return `${MONTHS[a.month]} ${a.year}`
  }
  if (b.year === a.year) return `${MONTHS[a.month]}–${MONTHS[b.month]} ${a.year}`
  return `${a.year}–${b.year}`
}

/** The date line under an album's title. The kind is shown as a badge. */
export function albumSubtitle(album) {
  return albumWhen(album?.first_taken, album?.last_taken)
}
