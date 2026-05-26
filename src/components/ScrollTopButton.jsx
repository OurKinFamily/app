import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

// Fixed bottom-right pill that fades in after the user has scrolled the window
// past `threshold` px. Click → smooth-scroll to top. Sits above page content
// but below the mobile bottom bar (z below 1100) and above the date scrubber's
// hover layer effects.
export function ScrollTopButton({ threshold = 500 }) {
  const [show, setShow] = useState(
    () => typeof window !== 'undefined' && window.scrollY > threshold,
  )
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > threshold)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className={
        'fixed right-14 bottom-20 z-[1050] flex h-10 w-10 items-center justify-center md:right-20 ' +
        'rounded-full bg-white/10 text-white/80 backdrop-blur transition-opacity ' +
        'hover:bg-white/20 md:bottom-4 ' +
        (show ? 'opacity-100' : 'pointer-events-none opacity-0')
      }
    >
      <ArrowUp size={18} />
    </button>
  )
}
