/**
 * How the people list can be ordered.
 *
 * "Closest first" is the API's own order — the viewer, then kin, then people
 * sharing a surname, each tier by how often they appear in photographs. v1
 * showed this and offered nothing else, and it is the only ordering that
 * answers "who is this archive about" rather than "what letter does their
 * name start with".
 */
export const SORTS = [
  { key: 'photos', label: 'Most photographs' },
  { key: 'suggested', label: 'Closest first' },
  { key: 'name', label: 'Name' },
  { key: 'born', label: 'Oldest first' },
]

/** What the list opens on. */
export const DEFAULT_SORT = 'photos'

/** "Unknown person 2026-06-03 03:20" and friends sink to the bottom. */
const isPlaceholder = p => (/^Unknown person\b/.test(p?.name || '') ? 1 : 0)
const byPlaceholder = (a, b) => isPlaceholder(a) - isPlaceholder(b)

const displayName = p => String(p?.known_as || p?.name || '')

function surname(p) {
  const parts = String(p?.name || '').trim().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : (p?.name || '')
}

/**
 * Order the people list.
 *
 * Returns a new array; the caller's is left alone. Placeholders sink to the
 * bottom of every ordering — the family list used to open on three blank
 * "Unknown person" records, which is a poor first impression of an archive
 * about actual people.
 */
export function sortPeople(rows, sort) {
  const list = [...(rows || [])]
  if (sort === 'photos') {
    // Most photographed first. The people the archive is actually about are
    // the ones it has the most pictures of, and that beats any ordering by
    // name for finding somebody.
    return list.sort((a, b) => byPlaceholder(a, b)
      || (b?.photo_count || 0) - (a?.photo_count || 0)
      || displayName(a).localeCompare(displayName(b)))
  }
  if (sort === 'suggested') return list.sort(byPlaceholder)
  if (sort === 'born') {
    return list.sort((a, b) => byPlaceholder(a, b)
      // Somebody with no birth date sorts after everybody who has one,
      // rather than landing at the very top as an empty string would.
      || (a?.birth_date ? 0 : 1) - (b?.birth_date ? 0 : 1)
      || String(a?.birth_date || '').localeCompare(String(b?.birth_date || ''))
      || displayName(a).localeCompare(displayName(b)))
  }
  return list.sort((a, b) => byPlaceholder(a, b)
    || surname(a).localeCompare(surname(b))
    || displayName(a).localeCompare(displayName(b)))
}
