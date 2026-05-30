// Helpers for MediaLightbox. Plain JS — kept out of the .jsx file to stay under
// the 250-line cap.
import { mediaUrl } from '../lib/media'

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
// `/api/media/<path>` URL, then to thumbnail_url. Track tried URLs on the
// element so a chain of failures doesn't loop between the same two
// fallbacks forever.
export function onMediaError(e, item) {
  const el    = e.currentTarget
  const tried = new Set((el.dataset.tried || '').split('|').filter(Boolean))
  if (el.src) tried.add(el.src)

  const candidates = [
    item.url || (item.path ? mediaUrl(item.path) : null),
    item.thumbnail_url,
  ].filter(Boolean)

  const next = candidates.find(u => !tried.has(u) && !el.src.endsWith(u))
  if (next) {
    tried.add(next)
    el.dataset.tried = [...tried].join('|')
    el.src = next
    return
  }
  // Exhausted — stop trying and hide the broken image.
  el.style.display = 'none'
}
