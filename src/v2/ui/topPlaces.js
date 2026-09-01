/** The places a group's photos were taken, most common first. */
export function topPlaces(items, limit = 3) {
  const counts = new Map()
  for (const it of items) {
    const place = it.city || it.place_name
    if (!place) continue
    counts.set(place, (counts.get(place) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([place]) => place)
}
