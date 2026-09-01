/**
 * Layout constants shared by the grid and its virtualised wrapper.
 *
 * Separate module so both can import them without a component file exporting
 * plain values, which breaks fast refresh.
 */

// Tight enough that photographs form a continuous field rather than sitting as
// separate cards.
export const GAP = 4

/**
 * Target row height for a given container width.
 *
 * Google Photos' rough proportions: keep three or four photographs across at
 * any width, rather than letting a phone become a single column of enormous
 * pictures. `computeRows` scales each row around this, so it is a target, not
 * a rule.
 */
export function rowHeightFor(width) {
  if (width < 500) return 120
  if (width < 900) return 180
  return 220
}
