import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

// Remembers scroll position per pathname so navigating to a sub-page and back
// (e.g. gallery → photo → back) returns you to where you were.
// New pathnames start at 0. Year-only changes within /gallery (URL-sync from
// scroll position) are treated as the same view — no restore-to-saved jump.
const positions = new Map()

function isGalleryYearPath(p) {
  return p === '/gallery' || /^\/gallery\/\d{4}$/.test(p)
}

export function ScrollToTop() {
  const { pathname } = useLocation()
  const lastPathRef = useRef(pathname)

  useEffect(() => {
    const last = lastPathRef.current
    lastPathRef.current = pathname

    // Skip the restore-to-saved jump when moving within the gallery year URLs —
    // the URL is just reflecting scroll position; don't fight the user.
    if (!(isGalleryYearPath(last) && isGalleryYearPath(pathname))) {
      const saved = positions.get(pathname)
      window.scrollTo(0, saved ?? 0)
    }

    const onScroll = () => positions.set(pathname, window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      positions.set(pathname, window.scrollY)
      window.removeEventListener('scroll', onScroll)
    }
  }, [pathname])

  return null
}
