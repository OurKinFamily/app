// Pure data shaping for the gantt-style ConnectionTimeline. Lifted out of
// the component so the math is unit-testable on its own — no rendering,
// no router, no DOM.

export function yearOf(ts) {
  return Number(String(ts).slice(0, 4))
}

// People are merged into one bar only when (a) they share the same start +
// end year AND (b) their photo counts are within COUNT_RATIO of each other.
// This keeps a deep relationship from being merged with cameo people who
// happen to overlap its exact span.
export const COUNT_RATIO = 3

export function groupBySpan(rows) {
  // First bucket by (first_year, last_year)
  const buckets = new Map()
  for (const r of rows) {
    const key = `${yearOf(r.first_ts)}|${yearOf(r.last_ts)}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(r)
  }

  // Within each year-bucket, sort by photo_count desc and split into
  // sub-groups whenever the count drops more than COUNT_RATIO× from the
  // current sub-group's max.
  const groups = []
  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => (b.photo_count || 0) - (a.photo_count || 0))
    let current = []
    let groupMax = 0
    for (const r of bucket) {
      const c = r.photo_count || 0
      if (current.length === 0 || c * COUNT_RATIO >= groupMax) {
        current.push(r)
        if (c > groupMax) groupMax = c
      } else {
        groups.push(current)
        current  = [r]
        groupMax = c
      }
    }
    if (current.length) groups.push(current)
  }

  return groups.map(group => {
    const first_ts = group.reduce((a, b) => (a.first_ts < b.first_ts ? a : b)).first_ts
    const last_ts  = group.reduce((a, b) => (a.last_ts  > b.last_ts  ? a : b)).last_ts
    const total    = group.reduce((s, r) => s + (r.photo_count || 0), 0)
    return {
      id:          group.map(r => r.id).join('+'),
      people:      group,
      first_ts,
      last_ts,
      photo_count: total,
    }
  })
}

// Sort bars by duration DESC so the longest-running ones land in the top
// lanes, then assign each bar to the first lane where it doesn't overlap.
export function packLanes(rows) {
  const ordered = [...rows].sort((a, b) => {
    const da = yearOf(a.last_ts) - yearOf(a.first_ts)
    const db = yearOf(b.last_ts) - yearOf(b.first_ts)
    if (db !== da) return db - da
    return String(a.first_ts).localeCompare(String(b.first_ts))
  })
  const lanes  = []   // each lane = array of placed rows
  const placed = []   // [{row, lane, start, end}]
  for (const r of ordered) {
    const start = yearOf(r.first_ts)
    const end   = yearOf(r.last_ts)
    let laneIdx = lanes.findIndex(lane =>
      lane.every(other => yearOf(other.last_ts) < start || yearOf(other.first_ts) > end)
    )
    if (laneIdx === -1) { laneIdx = lanes.length; lanes.push([]) }
    lanes[laneIdx].push(r)
    placed.push({ row: r, lane: laneIdx, start, end })
  }
  return { lanes, placed }
}
