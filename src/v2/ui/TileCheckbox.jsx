import { useState } from 'react'
import { C } from './tokens'

/**
 * Selection checkbox for a tile's overlay.
 *
 * A real `<input type="checkbox">`, visually hidden but present: it keeps the
 * native semantics, keyboard behaviour and form participation, and screen
 * readers announce it as a checkbox without any aria plumbing. The visible box
 * is a sibling span, which can be styled far past what a native control allows
 * — necessary when it has to stay legible over an arbitrary photograph.
 *
 * Square by design. Round overlay controls are for verbs (menu, share); square
 * is for state.
 */
export function TileCheckbox({ checked = false, onChange, label = 'Select' }) {
  const [hover, setHover] = useState(false)
  const [active, setActive] = useState(false)
  const [focus, setFocus] = useState(false)

  // The empty ring sits a little smaller than the filled one, so checking it
  // reads as the circle growing into place rather than merely changing colour.
  // The label's footprint is fixed, so nothing around it moves.
  const size = checked ? 20 : 17

  const box = {
    display: 'grid',
    placeItems: 'center',
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    flex: '0 0 auto',
    aspectRatio: '1 / 1',
    boxSizing: 'border-box',   // keeps it square once a border is added
    borderRadius: '50%',
    color: '#fff',
    transform: active ? 'scale(0.9)' : 'scale(1)',
    transition: 'background 120ms ease, border-color 120ms ease, transform 80ms ease, width 120ms ease, height 120ms ease',
    // Same blue as the tile's own focus ring, so focus looks like one thing
    // wherever it lands. Sits outside the box rather than replacing the border.
    // When checked the box is already that blue, so a white hairline separates
    // the two — otherwise the ring merges into the fill and vanishes.
    boxShadow: focus
      ? (checked
          ? `0 0 0 2px #fff, 0 0 0 4px ${C.activeText}`
          : `0 0 0 2px ${C.activeText}`)
      : undefined,
  }

  const unchecked = {
    // At rest: an empty ring, nothing behind it, so the photograph shows
    // straight through. Not pure white — at full opacity it reads as a hard UI
    // chip stuck onto the picture rather than floating over it.
    //
    // On hover it fills white with a dark tick: a preview of what clicking
    // does, in the same shape it will take.
    border: `1.5px solid ${hover || focus ? '#fff' : 'rgba(255,255,255,.6)'}`,
    background: hover || focus ? '#fff' : 'transparent',
    color: C.muted,   // softer than near-black against a white fill
    // A pale photo would otherwise swallow a white outline entirely.
    filter: 'drop-shadow(0 0 2px rgba(0,0,0,.55))',
  }

  const checkedStyle = {
    // Solid blue, border included, so the ring reads as filled rather than a
    // blue disc sitting inside a white circle.
    border: `1.5px solid ${hover || focus ? '#0a4bb8' : C.activeText}`,
    background: hover || focus ? '#0a4bb8' : C.activeText,
    filter: 'drop-shadow(0 0 2px rgba(0,0,0,.35))',
  }

  return (
    <label
      style={{
        position: 'relative',
        display: 'inline-grid',
        placeItems: 'center',
        flex: '0 0 auto',
        // Same footprint as TileControl, though nothing is drawn here. The slot
        // is a centred flex row: without this the 20px box sat 5px higher than
        // the 30px menu button, and the row re-centred the moment hover brought
        // the menu in — the checkbox appeared to jump.
        width: 30,
        height: 30,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false) }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      // The tile beneath must not also fire — selecting is not opening.
      onClick={e => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        onChange={e => onChange?.(e.target.checked)}
        onFocus={e => setFocus(e.target.matches(':focus-visible'))}
        onBlur={() => setFocus(false)}
        style={{
          position: 'absolute', inset: 0, margin: 0,
          width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer',
        }}
      />
      <span style={{ ...box, ...(checked ? checkedStyle : unchecked) }}>
        {(checked || hover || focus) && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="3.5"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
    </label>
  )
}
