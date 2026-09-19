/**
 * Fractions of what is on screen become pixels of the full-size photograph.
 * The API maps those onto the stored file, which may be lying on its side.
 */
export async function applyCrop({ item, box, angle, imgRef, onCrop, setCropping, setCrop, setAngle }) {
  let w = item.width || imgRef.current?.naturalWidth
  let h = item.height || imgRef.current?.naturalHeight
  if (!w || !h) return
  // The rectangle was drawn on the STRAIGHTENED picture, which is bigger than
  // the original — turning a rectangle and keeping its corners always is. The
  // server rotates with expand as well, so both agree on this size.
  if (angle) {
    const r = (Math.abs(angle) * Math.PI) / 180
    const [cos, sin] = [Math.cos(r), Math.sin(r)]
    ;[w, h] = [w * cos + h * sin, w * sin + h * cos]
  }
  const rect = {
    x: Math.round(box.x1 * w),
    y: Math.round(box.y1 * h),
    w: Math.round((box.x2 - box.x1) * w),
    h: Math.round((box.y2 - box.y1) * h),
    angle,
  }
  // The server refuses anything under 32px a side, and a refused request looks
  // exactly like a button that does nothing.
  if (rect.w < 32 || rect.h < 32) return
  setCropping(true)
  try {
    await onCrop(item, rect)
    setCrop(false)
    // The file is straight now, so the preview must stop turning it. Leaving
    // the transform on meant the photograph looked as crooked as before until
    // the page was reloaded — the crop had worked, the browser was still
    // rotating the result.
    setAngle(0)
  } finally {
    setCropping(false)
  }
}
