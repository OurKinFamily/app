// Pure helpers for the day-grouped gallery view. Lifted out of MediaGallery
// so the date/city math is unit-testable on its own.

export function formatDay(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// Bucket items by `YYYY-MM-DD` (slice of the ISO timestamp). Items without a
// timestamp land in the `__unknown` bucket so the gallery can still render
// them in a dedicated section.
export function groupByDay(items) {
  const map = new Map()
  for (const it of items) {
    const day = it.timestamp ? it.timestamp.slice(0, 10) : '__unknown'
    if (!map.has(day)) map.set(day, [])
    map.get(day).push(it)
  }
  return [...map.entries()].map(([day, items]) => ({ day, items }))
}

// Distinct cities (or place names, falling back) present in a day group.
// Used by the day-header label "Mar 21, 2024 · Lancaster & Newburyport".
export function citiesFor(items) {
  const set = new Set()
  for (const it of items) {
    const c = it.city || it.place_name
    if (c) set.add(c)
  }
  return [...set]
}
