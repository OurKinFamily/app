import { useState } from 'react'
import { C } from './tokens'

/**
 * The standard overlay control: circular, white, with a translucent black
 * ground that appears on hover so it reads as a target over any photograph.
 *
 * Lives here rather than in each caller so every overlay icon in the app
 * behaves the same — that's the whole point of one tile.
 */
export function TileControl({ children, label, onClick, tabIndex }) {
  const [over, setOver] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [focus, setFocus] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={tabIndex}
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => { setOver(false); setPressed(false) }}
      onFocus={e => { setOver(true); setFocus(e.target.matches(':focus-visible')) }}
      onBlur={() => { setOver(false); setFocus(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      // A button activated from the keyboard gets no mousedown, so the pressed
      // state has to be driven from the keys as well — otherwise holding Space
      // looks like nothing is happening.
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') setPressed(true) }}
      onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') setPressed(false) }}
      // Stop the tile's own click firing underneath: pressing the menu should
      // not also open the photo.
      onClick={e => { e.stopPropagation(); onClick?.(e) }}
      style={{
        display: 'grid', placeItems: 'center',
        // Pinned every way it can be squeezed: the slot is a flex row, and a
        // flex item will happily shrink on one axis and leave you an oval.
        width: 30, height: 30, minWidth: 30, minHeight: 30,
        flex: '0 0 auto', aspectRatio: '1 / 1',
        boxSizing: 'border-box', borderRadius: '50%',
        border: 0, padding: 0,
        background: pressed
          ? 'rgba(0,0,0,.75)'
          : over ? 'rgba(0,0,0,.55)' : 'transparent',
        transform: pressed ? 'scale(0.9)' : 'scale(1)',
        color: '#fff', cursor: 'pointer', outline: 'none',
        boxShadow: focus ? `0 0 0 2px ${C.activeText}` : undefined,
        transition: 'background 120ms ease, transform 80ms ease',
      }}
    >
      {children}
    </button>
  )
}

