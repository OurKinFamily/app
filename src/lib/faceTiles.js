/**
 * Which face crops to put on screen for a suggestion.
 *
 * A suggestion is a bag of clusters, and each cluster is several faces of
 * (hopefully) one person. The first version of the card showed one crop per
 * cluster and threw the rest away, which produced the thing that prompted
 * this: two thumbnails above a button reading "Confirm 4". You were asked to
 * vouch for faces you had not been shown.
 *
 * So: one tile per cluster first — a singleton is weak evidence and hiding it
 * behind a sibling's face defeats the review — then the leftover room goes on
 * each cluster's second crop, then its third, and so on. A card with two
 * clusters shows everything it has; a card with sixty still shows all sixty
 * clusters, as before.
 *
 * A cluster with no usable crop still gets a tile. It renders as "no crop",
 * which is ugly and correct: the faces are real and about to be confirmed,
 * and a missing picture is not a reason to hide them.
 */
export function faceTiles(clusters, budget) {
  const pools = (clusters || []).map(c => ({
    cluster_id: c?.cluster_id,
    n_faces: c?.n_faces,
    samples: (c?.samples || []).filter(s => s?.crop_url),
  }))

  const cap = budget == null ? Infinity : budget
  const deepest = pools.reduce((n, p) => Math.max(n, p.samples.length), 0)
  const available = pools.reduce((n, p) => n + Math.max(1, p.samples.length), 0)

  const tiles = []
  for (let depth = 0; depth < Math.max(1, deepest) && tiles.length < cap; depth += 1) {
    for (const p of pools) {
      if (tiles.length >= cap) break
      const s = p.samples[depth]
      // Depth 0 always places a tile, crop or no crop. Deeper passes only
      // place one where the cluster actually has another face to show.
      if (!s && depth > 0) continue
      tiles.push({
        cluster_id: p.cluster_id,
        n_faces: p.n_faces,
        crop_url: s?.crop_url,
        photo_path: s?.photo_path,
      })
    }
  }

  return { tiles, hidden: Math.max(0, available - tiles.length) }
}

/**
 * How many of the faces being confirmed are actually on screen.
 *
 * The api returns a handful of crops per cluster, not all of them, so a
 * suggestion covering thousands of faces can never be shown in full. Saying
 * so out loud is the point — "Confirm 6,890" under a dozen thumbnails should
 * admit what it is rather than imply you have seen the batch.
 */
export function tileCoverage(shown, total) {
  const n = Number(total)
  if (!Number.isFinite(n) || n <= shown) return null
  return `Showing ${shown.toLocaleString()} of ${n.toLocaleString()} faces`
}
