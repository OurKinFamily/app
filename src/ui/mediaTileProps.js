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
export function mediaTileProps(item, version) {
  return {
    src: bust(item.thumbnail_url, version),
    alt: describeMedia(item),
    color: item.dominant_color || undefined,
    isVideo: !!item.is_video,
  }
}

/**
 * Add a per-file cache token to a media URL.
 *
 * A photograph keeps its URL when it is rotated, so the browser goes on
 * serving the pixels it already has — the file changed, the address did not.
 * The rotate endpoint hands back the file's new modification time, and adding
 * it here is what makes the reload actually fetch.
 *
 * Undefined version means untouched, and the URL is returned as it came: only
 * the handful of files edited this session carry a token.
 */
export function bust(url, version) {
  if (!url || !version) return url
  return `${url}${url.includes('?') ? '&' : '?'}r=${version}`
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


/** Seconds to m:ss, the way a video player writes it. */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return null
  const total = Math.round(seconds)
  const m = Math.floor(total / 60)
  const ss = String(total % 60).padStart(2, '0')
  return `${m}:${ss}`
}
