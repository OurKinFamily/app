import { useEffect, useState } from 'react'

/**
 * Where an element sits inside its positioned ancestor.
 *
 * For drawing something on top of a photograph. The obvious version measures
 * the image against the viewport and puts the overlay a scroll-position away
 * from where it should be; what an absolutely-positioned overlay needs is the
 * offset within the box it is positioned against — the same trap the face
 * boxes fell into, where they were measured on the image and drawn on the
 * padded pane around it.
 *
 * `active` gates the work: nothing is measured until something wants it.
 */
export function useElementRect(ref, active) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!active) {
      // Deferred: clearing state straight from the effect body starts another
      // render before this one has painted.
      queueMicrotask(() => setRect(null))
      return
    }
    const measure = () => {
      const el = ref.current
      const host = el?.offsetParent
      if (!el || !host) return
      const a = el.getBoundingClientRect()
      const b = host.getBoundingClientRect()
      setRect({
        left: a.left - b.left, top: a.top - b.top,
        width: a.width, height: a.height,
      })
    }
    measure()
    // The photograph is laid out with object-fit, so its box changes with the
    // window even though the element does not move in the document.
    window.addEventListener('resize', measure)
    const t = setTimeout(measure, 60)   // after the image has settled
    return () => {
      window.removeEventListener('resize', measure)
      clearTimeout(t)
    }
  }, [ref, active])

  return rect
}
