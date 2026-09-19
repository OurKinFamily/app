import { useEffect, useState } from 'react'
import { C } from './tokens'

/**
 * Face outlines drawn over the photograph.
 *
 * Hovering a face in the panel highlights it on the picture, and hovering the
 * picture highlights it in the panel. Without that link a column of cropped
 * faces is a puzzle — which of the four people in this photograph is "Henry"?
 *
 * The geometry is the fiddly part. Boxes are stored in the image's own display
 * pixels, but the image is rendered with object-fit: contain inside a padded
 * pane, so it is letterboxed by an amount that depends on both aspect ratios.
 * That offset has to be worked out rather than assumed, or every box lands in
 * the wrong place on anything that isn't exactly the pane's shape.
 */
export function FaceBoxes({ imgRef, faces, hovered, onHover, onPick }) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const measure = () => {
      const { naturalWidth: nw, naturalHeight: nh } = img
      if (!nw || !nh) return
      const box = img.getBoundingClientRect()
      // Boxes are positioned against the PANE, not the image, so the image's
      // own offset within it has to be added — the pane is padded, and without
      // this every box sits exactly one padding off.
      const pane = img.offsetParent || img.parentElement
      const paneBox = pane.getBoundingClientRect()
      const offsetX = box.left - paneBox.left
      const offsetY = box.top - paneBox.top

      // object-fit: contain — the image is scaled to the smaller of the two
      // ratios and centred in whatever space is left over.
      const scale = Math.min(box.width / nw, box.height / nh)
      setRect({
        left: offsetX + (box.width - nw * scale) / 2,
        top: offsetY + (box.height - nh * scale) / 2,
        scale,
        // Kept so a label can tell whether it is about to run off an edge.
        paneW: paneBox.width,
        paneH: paneBox.height,
      })
    }

    measure()
    // naturalWidth is 0 until the file has loaded, so measure again then.
    img.addEventListener('load', measure)
    const ro = new ResizeObserver(measure)
    ro.observe(img)
    // The pane resizes when the info panel opens or closes, which moves the
    // image without changing its own size.
    const pane = img.offsetParent || img.parentElement
    if (pane) ro.observe(pane)
    return () => {
      img.removeEventListener('load', measure)
      ro.disconnect()
    }
  }, [imgRef])

  if (!rect || !faces?.length) return null

  return (
    <>
      {faces.map(f => {
        if (!f.bbox || f.bbox.length < 4) return null
        const [x1, y1, x2, y2] = f.bbox
        const on = hovered === f.face_index

        const left = rect.left + x1 * rect.scale
        const top = rect.top + y1 * rect.scale
        const width = (x2 - x1) * rect.scale
        // A face near the top has no room above it for its name, and one near
        // the right edge would push the label off the screen. Flip rather than
        // clip: a name half cut off is worse than no name at all, because you
        // cannot tell whether it is the right person.
        const labelBelow = top < 26
        const labelRight = left + width > rect.paneW - 120
        return (
          <div
            key={f.face_index}
            onMouseEnter={() => onHover?.(f.face_index)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onPick?.(f)}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height: (y2 - y1) * rect.scale,
              // Invisible until wanted. A photograph permanently marked up
              // with rectangles is a diagram, not a picture — and the whole
              // point of the detail view is to look at the picture. The box
              // stays a hover target regardless, so moving over a face still
              // reveals it.
              //
              // Named faces get the accent, unnamed ones a plain white outline:
              // the difference between a fact and a question.
              border: `2px solid ${
                on ? (f.name ? C.activeText : 'rgba(255,255,255,.95)') : 'transparent'
              }`,
              borderRadius: 3,
              opacity: on ? 1 : 0,
              transition: 'opacity 140ms ease, border-color 140ms ease',
              pointerEvents: 'auto',
              cursor: 'pointer',
              zIndex: on ? 4 : 3,
            }}
          >
            {on && f.name && (
              <span
                style={{
                  position: 'absolute',
                  ...(labelRight ? { right: 0 } : { left: 0 }),
                  ...(labelBelow
                    ? { top: '100%', marginTop: 4 }
                    : { bottom: '100%', marginBottom: 4 }),
                  padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap',
                  background: C.activeText, color: '#fff', fontSize: 11,
                  // A very long name still has to stop somewhere.
                  maxWidth: rect.paneW - 16, overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {f.name}
              </span>
            )}
          </div>
        )
      })}
    </>
  )
}
