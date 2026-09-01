/**
 * Adapters for MediaTile.
 *
 * Separate from the component so fast refresh keeps working — a file that
 * exports both a component and plain functions loses it.
 *
 * Callers whose data isn't a gallery item write their own adapter rather than
 * bending the tile: face crops, heritage documents and search hits all have
 * different shapes and all need a picture in a box.
 */

/**
 * Adapter for gallery API items. Callers with a different shape write their
 * own three lines rather than bending the tile.
 */
export function mediaTileProps(item) {
  return {
    src: item.thumbnail_url,
    alt: describeMedia(item),
    color: item.dominant_color || undefined,
    isVideo: !!item.is_video,
  }
}

/** Date and place — the two things always known about a photo. */
export function describeMedia(item) {
  const when = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString(undefined, {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null
  const where = item.place_name || item.city || null
  const kind = item.is_video ? 'Video' : 'Photo'
  if (when && where) return `${kind} from ${when}, ${where}`
  if (when) return `${kind} from ${when}`
  if (where) return `${kind} from ${where}`
  return kind
}
