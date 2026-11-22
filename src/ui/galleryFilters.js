/**
 * The gallery's filter state, and how it becomes a query string.
 *
 * Kept apart from the panel that draws it because three things need to agree
 * on it: the panel, the items fetch, and the counts fetch. The virtualised
 * grid sizes itself from counts and then asks for items; if the two are built
 * from different filters the layout reserves space that never fills.
 */

/**
 * Everything off. `confidence: 'all'` is the important one — until
 * 2026-11-22 the gallery defaulted to high-confidence only, which hid 26,900
 * photographs (14.7% of the archive) that were in the graph and on disk the
 * whole time.
 */
export const NO_FILTERS = {
  confidence: 'all',     // all | high | medium | low
  confidenceExact: false, // false = "and better", true = only that level
  mediaType: 'all',      // all | photo | video
  gps: 'both',           // both | has | none
  faces: 'any',          // any | unassigned
  camera: '',            // exact camera_model
}

export const CONFIDENCE_CHOICES = [
  { value: 'all', label: 'Any' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

/** How many filters are doing something — for the badge on the button. */
export function activeCount(f) {
  return Object.keys(NO_FILTERS).filter(k => {
    // The exact/and-better switch is a modifier, not a filter of its own: on
    // its own it narrows nothing, so counting it would show "1 active" for a
    // gallery showing everything.
    if (k === 'confidenceExact') return false
    return f[k] !== NO_FILTERS[k]
  }).length
}

/**
 * Filters -> query string, merged onto whatever the page already carries.
 *
 * `base` is the view's own identity (Favourites adds `favorites=true`), and it
 * wins: a filter cannot widen a view past what it is.
 */
export function toQuery(f, base = '') {
  const q = new URLSearchParams(base)

  if (f.confidence !== 'all') {
    // Two different questions, and the api takes them as two parameters.
    // "medium and better" is for browsing; "exactly medium" is how you find
    // what still needs a date.
    if (f.confidenceExact) q.set('confidence', f.confidence)
    else q.set('min_confidence', f.confidence)
  }
  if (f.mediaType !== 'all') q.set('media_type', f.mediaType)
  if (f.gps !== 'both') q.set('gps', f.gps)
  if (f.faces === 'unassigned') q.set('unassigned_faces', 'true')
  if (f.camera) q.set('camera_model', f.camera)

  return q.toString()
}
