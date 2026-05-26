import { createPortal } from 'react-dom'

// Renders children into MainLayout's #layout-subheader slot, which sits inside
// the sticky app header (below AppHeader, above page content). Pages use this
// to inject a sub-bar (filters, tabs) that participates in the global header.
// While the portal is mounted, the layout exposes `--app-header-h` reflecting
// the combined header height; sticky child elements (day group headers, etc.)
// can read it via `top: var(--app-header-h)`.
//
// MainLayout always renders #layout-subheader (siblings to AppHeader) before
// the <Outlet/> mounts, so the node is in the DOM by the time any page renders.
export function SubheaderPortal({ children }) {
  const el = typeof document !== 'undefined'
    ? document.getElementById('layout-subheader')
    : null
  if (!el) return null
  return createPortal(children, el)
}
