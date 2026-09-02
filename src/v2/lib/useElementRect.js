import { useEffect, useState } from 'react'

/**
 * Where an element sits in the window.
 *
 * For drawing something on top of a photograph. Viewport coordinates, paired
 * with a `position: fixed` overlay, so no positioned ancestor is required:
 * measuring against `offsetParent` looked tidier and then returned nothing
 * when there wasn't one, leaving the overlay unrendered and the crop button
 * apparently dead.
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
      if (!el) return
      const r = el.getBoundingClientRect()
      // A zero-size box is not a measurement, it is an element that has not
      // laid out yet. Reporting it as one is what broke the crop.
      if (!r.width || !r.height) return
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height })
    }
    measure()
    // A photograph that has not decoded yet measures ZERO. Everything drawn
    // on it then divides by zero, and a perfectly real drag collapses to a
    // point — which the server refuses as a zero-width crop. So watch the
    // element rather than measuring once and hoping.
    const ro = new ResizeObserver(measure)
    if (ref.current) ro.observe(ref.current)
    // The photograph is laid out with object-fit, so its box changes with the
    // window even though the element does not move in the document.
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref, active])

  return rect
}
