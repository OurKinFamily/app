import { useEffect, useState } from 'react'

/**
 * Is there room for the photograph and its details side by side?
 *
 * 900px, below which the info panel stops being a column beside the picture
 * and becomes something you scroll to. A media query rather than a resize
 * listener: it fires only when the answer changes, not on every pixel of a
 * drag.
 */
export function useIsWide() {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 900,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const on = e => setWide(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}
