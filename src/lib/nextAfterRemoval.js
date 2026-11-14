/**
 * Which photograph to show once this one is gone.
 *
 * Deleting used to close the lightbox and drop you back in the grid, which is
 * the wrong move for the thing people actually do: working through a run of
 * near-duplicates — eight shots of the same moment, seven of them blurred —
 * and throwing out the bad ones. Closing after every delete means finding
 * your place again each time.
 *
 * Forward first, because that is the direction you were already going.
 * Backward only when there is nothing ahead, so deleting the last photograph
 * in a set leaves you on the new last one rather than dumping you out. Null
 * means that really was the only one left, and the caller should close.
 *
 * Call this with the list as it stands BEFORE the removal. The pages disagree
 * about what to do next — the gallery hides the tile and keeps it in place,
 * albums and person pages filter it out — and both of those take effect on a
 * later render anyway, so the pre-removal list is the only view both share.
 * `hidden` carries the paths already deleted this session, which the gallery
 * keeps rather than splicing out; without it a run of deletes would land on a
 * photograph that is no longer there.
 */
export function nextAfterRemoval(items, path, hidden) {
  const list = items || []
  const i = list.findIndex(m => m?.path === path)
  if (i < 0) return null
  // A usable neighbour: something really there, not the one going away, and
  // not one deleted earlier in this run.
  const usable = m => !!m?.path && m.path !== path && !hidden?.has(m.path)

  for (let k = i + 1; k < list.length; k += 1) {
    if (usable(list[k])) return list[k]
  }
  for (let k = i - 1; k >= 0; k -= 1) {
    if (usable(list[k])) return list[k]
  }
  return null
}
