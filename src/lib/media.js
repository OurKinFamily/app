const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mts', 'mpg', 'mpeg'])

export function isVideo(path) {
  return VIDEO_EXTS.has(path?.split('.').pop()?.toLowerCase())
}

export function mediaUrl(path) {
  return `/api/media/${path}`
}

export function thumbUrl(path) {
  // Strip leading archive/ — thumb server stores relative to archive root
  return `/api/media/thumb/${path.replace(/^archive\//, '')}`
}
