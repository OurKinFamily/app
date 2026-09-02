/**
 * "haverhill-house" → "Haverhill House".
 *
 * The shortcuts are stored as slugs because they're typed at a command line;
 * nobody should have to read them that way. Small words stay lowercase so
 * "point-of-pines" doesn't come out as "Point Of Pines".
 */
const MINOR = new Set(['of', 'the', 'at', 'on', 'in', 'and', 'by'])

export function prettyPlace(slug) {
  return (slug || '')
    .split('-')
    .map((w, i) => (i > 0 && MINOR.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}
