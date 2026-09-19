/**
 * v2 design tokens — the one place the skin's colours are decided.
 *
 * Lived inline in Layout, then got copied into the style guide, then the
 * tile needed it too. Three copies is how a style guide starts lying about the
 * app, so it lives here now.
 *
 * Plain JS rather than CSS variables while the palette is still moving: it can
 * be imported by components and read in the style guide with the same syntax.
 */
export const C = {
  bg: '#ffffff',
  surface: '#f8f9fa',       // header + sidebar ground
  border: '#e3e3e3',
  text: '#1f1f1f',
  muted: '#5f6368',
  activeBg: '#e8f0fe',      // selected nav pill
  activeText: '#0b57d0',    // accent: selection, active nav, focus
  hover: '#f1f3f4',
}
