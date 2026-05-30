const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mts', 'mpg', 'mpeg'])

// Bump when thumbs/medium are regenerated and you need to invalidate browser caches.
// Server sends `Cache-Control: immutable, max-age=1w`, so the only way to force a
// refetch is a new URL. Append `?v=<MEDIA_VERSION>` to every /api/media/* URL.
export const MEDIA_VERSION = 1

function v(url) {
  return url + (url.includes('?') ? '&' : '?') + 'v=' + MEDIA_VERSION
}

export function isVideo(path) {
  return VIDEO_EXTS.has(path?.split('.').pop()?.toLowerCase())
}

export function mediaUrl(path) {
  return v(`/api/media/${path}`)
}

export function thumbUrl(path) {
  // Strip leading archive/ — thumb server stores relative to archive root
  return v(`/api/media/thumb/${path.replace(/^archive\//, '')}`)
}

export function mediumUrl(path) {
  // Unlike thumbUrl, the medium endpoint resolves the source file from path AS-IS
  // (settings.photos_root / path). Stripping "archive/" would point at the wrong file.
  return v(`/api/media/medium/${path}`)
}

// Pass-through cache-buster for URLs built elsewhere (e.g. thumbnail_url from API)
export function withMediaVersion(url) {
  if (!url) return url
  return v(url)
}
