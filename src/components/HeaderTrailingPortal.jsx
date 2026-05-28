import { createPortal } from 'react-dom'

// Renders children into AppHeader's #layout-header-trailing slot, which sits
// at the right end of the header row (left of the hamburger on mobile, at the
// far right on desktop where the hamburger is hidden). Use for icon buttons
// that should live in the global header.
export function HeaderTrailingPortal({ children }) {
  const el = document.getElementById('layout-header-trailing')
  if (!el) return null
  return createPortal(children, el)
}
