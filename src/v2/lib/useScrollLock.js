import { useEffect } from 'react'

/**
 * Hold the page still behind a full-screen overlay.
 *
 * Without it the grid keeps its scrollbar, which looks wrong beside a
 * photograph filling the window and — worse — lets a stray wheel event scroll
 * eight million pixels of timeline out from under the reader, so closing the
 * overlay drops them somewhere they have never been.
 *
 * Restores whatever was there before rather than clearing it, since two
 * overlays open at once would otherwise leave the page unlocked when the first
 * one closes.
 */
export function useScrollLock() {
  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [])
}
