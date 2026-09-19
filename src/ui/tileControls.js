/**
 * Roving tabindex for controls that live inside a tile or a card.
 *
 * The rule Stephen asked for: Tab moves between ITEMS, never into their
 * controls, so a power user crosses a grid in as many keystrokes as there are
 * photographs. Arrow keys go into an item's controls and along them.
 *
 * That means every control has to be taken out of the tab order and driven by
 * hand, and the same mechanics are now needed by both MediaTile and
 * CollectionCard. One copy, because two would drift and only one of them would
 * get the next fix.
 */

// Every control inside a slot is marked so its container can find it for arrow
// navigation without knowing what it is.
export const CONTROL_ATTR = 'data-tile-control'

// Every focusable thing inside a slot, however deeply nested. NOT `> *`:
// TileCheckbox focuses an <input> inside a <label>, so the direct child is the
// label and the focused element was never found — arrow keys did nothing.
export const FOCUSABLE = ':is(button, a[href], input, select, textarea, [tabindex])'
export const CONTROL_SEL = `[${CONTROL_ATTR}] ${FOCUSABLE}`

/**
 * Take every control out of the tab order.
 *
 * Enforced in the DOM rather than by passing tabIndex down, because slot
 * children are arbitrary and often wrapped — OnHover swallowed the prop, which
 * let every control back into the tab sequence.
 */
export function demoteControls(root) {
  if (!root) return
  for (const el of root.querySelectorAll(CONTROL_SEL)) el.tabIndex = -1
}

/**
 * Arrow-key navigation between an item and its controls.
 *
 * `edges` maps a key to the slot it enters, so a media tile can offer both
 * bands and a card only its top one. Returns nothing; it acts on the event.
 */
export function handleControlKeys(e, root, edges = { ArrowUp: 'top', ArrowDown: 'bottom' }) {
  const controls = [...(root?.querySelectorAll(CONTROL_SEL) || [])]
  if (!controls.length) return
  const i = controls.indexOf(document.activeElement)

  // Entering: the arrow points the way the controls actually sit.
  if (i === -1) {
    const edge = edges[e.key]
    if (!edge) return
    const first = controls.find(
      c => c.closest(`[${CONTROL_ATTR}]`)?.getAttribute(CONTROL_ATTR) === edge,
    )
    if (first) { e.preventDefault(); first.focus() }
    return
  }

  // Left/Right walk along; Escape hands focus back to the item itself.
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    const step = e.key === 'ArrowRight' ? 1 : -1
    controls[(i + step + controls.length) % controls.length]?.focus()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    root?.querySelector(`button:not([${CONTROL_ATTR}] *)`)?.focus()
  }
}
