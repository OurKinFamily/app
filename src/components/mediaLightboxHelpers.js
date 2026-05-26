// Helpers for MediaLightbox. Plain JS — kept out of the .jsx file to stay under
// the 250-line cap.

// Maps a bbox to a CSS rect over the rendered <img> or <video>. Bboxes are
// stored as normalized [x1, y1, x2, y2] in 0..1 range — multiply by the
// element's painted size to get pixel coords.
export function bboxRect(el, bbox, pad = 0) {
  if (!el) return null
  const cw = el.clientWidth
  const ch = el.clientHeight
  if (!cw || !ch) return null
  const [x1, y1, x2, y2] = bbox
  return {
    left:   el.offsetLeft + x1 * cw - pad,
    top:    el.offsetTop  + y1 * ch - pad,
    width:  (x2 - x1) * cw + pad * 2,
    height: (y2 - y1) * ch + pad * 2,
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
