// Helpers for MediaLightbox. Plain JS — kept out of the .jsx file to stay under
// the 250-line cap.

// Maps a bbox to a CSS rect over the rendered <img> or <video>. Accepts
// either normalized [0..1] coords (preferred — MediaDetail tries to convert
// using known media dimensions) OR raw pixel coords (fallback for media
// where original dimensions weren't available, e.g. videos with width=0
// in metadata). Detected by whether any coord exceeds 1.5.
export function bboxRect(el, bbox, pad = 0) {
  if (!el) return null
  const cw = el.clientWidth
  const ch = el.clientHeight
  if (!cw || !ch) return null
  const [x1, y1, x2, y2] = bbox
  const isPixel = Math.max(x1, y1, x2, y2) > 1.5

  let sx, sy
  if (isPixel) {
    const nw = el.naturalWidth || el.videoWidth
    const nh = el.naturalHeight || el.videoHeight
    if (!nw || !nh) return null
    sx = cw / nw
    sy = ch / nh
  } else {
    sx = cw
    sy = ch
  }

  return {
    left:   el.offsetLeft + x1 * sx - pad,
    top:    el.offsetTop  + y1 * sy - pad,
    width:  (x2 - x1) * sx + pad * 2,
    height: (y2 - y1) * sy + pad * 2,
  }
}

// When the medium endpoint 404s (face-cluster paths sometimes lack the
// `archive/` prefix that endpoint assumes), fall back to the original
// `/api/media/<path>` URL, then to thumbnail_url.
export function onMediaError(e, item) {
  const orig = item.url || (item.path ? `/api/media/${item.path}` : null)
  if (orig && !e.currentTarget.src.endsWith(orig)) { e.currentTarget.src = orig; return }
  if (item.thumbnail_url && !e.currentTarget.src.endsWith(item.thumbnail_url)) {
    e.currentTarget.src = item.thumbnail_url
  }
}
