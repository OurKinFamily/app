const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mts', 'mpg', 'mpeg'])

// Bump when thumbs/medium/proxies are regenerated and you need to invalidate
// browser caches. The server sends `Cache-Control: immutable, max-age=1w`, so
// the only way to force a refetch is a new URL. Append `?v=<MEDIA_VERSION>` to
// every /api/media/* URL.
//
// 2 (2026-11-14): 4,415 videos gained H.264/AAC web proxies. Anyone who had
// opened one of those albums before had the undecodable original cached for a
// week under the identical URL, so the fix was invisible to them -- which is
// exactly the trap the crop-not-showing-on-staging report fell into as well.
export const MEDIA_VERSION = 2

function v(url) {
  return url + '?v=' + MEDIA_VERSION
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

