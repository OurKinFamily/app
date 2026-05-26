import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Remembers scroll position per pathname so navigating to a sub-page and back
// (e.g. gallery → photo → back) returns you to where you were.
// New pathnames start at 0.
const positions = new Map()

export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    const saved = positions.get(pathname)
    window.scrollTo(0, saved ?? 0)
    const onScroll = () => positions.set(pathname, window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      positions.set(pathname, window.scrollY)
      window.removeEventListener('scroll', onScroll)
    }
  }, [pathname])

  return null
}
