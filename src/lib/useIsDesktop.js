import { useEffect, useState } from 'react'

// Tailwind md breakpoint = 768px. Subscribes to matchMedia so the value tracks
// viewport resize / orientation change.
export function useIsDesktop() {
  const [is, setIs] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = e => setIs(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return is
}
