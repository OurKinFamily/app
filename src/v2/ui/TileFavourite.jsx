import { useState } from 'react'
import { Heart } from 'lucide-react'
import { C } from './tokens'

/**
 * Favourite toggle for a tile's overlay.
 *
 * Outlined white when it isn't a favourite, solid red when it is. The white
 * matches TileCheckbox at rest and goes fully opaque on hover, so the two
 * controls read as the same material rather than two separate designs.
 *
 * Unlike the checkbox, a favourited heart stays visible when the tile isn't
 * hovered — it's state worth seeing at a glance across a whole grid, not a
 * control you only need when reaching for it.
 */
export function TileFavourite({ favourited = false, onChange, label }) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [focus, setFocus] = useState(false)

  const lit = hover || focus

  return (
    <button
      type="button"
      role="switch"
      aria-checked={favourited}
      aria-label={label || (favourited ? 'Remove from favourites' : 'Add to favourites')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onFocus={e => setFocus(e.target.matches(':focus-visible'))}
      onBlur={() => { setFocus(false); setPressed(false) }}
      // Keyboard activation fires no mousedown, so the pressed state has to be
      // driven from the keys too or holding Space looks inert.
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') setPressed(true) }}
      onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') setPressed(false) }}
      // Favouriting is not opening: don't let the tile's click fire underneath.
      onClick={e => { e.stopPropagation(); onChange?.(!favourited) }}
      style={{
        display: 'grid', placeItems: 'center',
        width: 30, height: 30, minWidth: 30, minHeight: 30,
        flex: '0 0 auto', aspectRatio: '1 / 1',
        boxSizing: 'border-box', border: 0, padding: 0,
        borderRadius: '50%',
        background: 'transparent',
        // Matches TileCheckbox: translucent at rest, fully opaque on hover.
        color: favourited ? '#e8384f' : `rgba(255,255,255,${lit ? 1 : 0.6})`,
        // A pale photo would swallow a white outline entirely.
        filter: 'drop-shadow(0 0 2px rgba(0,0,0,.55))',
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        cursor: 'pointer', outline: 'none',
        boxShadow: focus ? `0 0 0 2px ${C.activeText}` : undefined,
        transition: 'color 120ms ease, transform 80ms ease',
      }}
    >
      <Heart
        size={18}
        // Solid when favourited, outline when not — the state is the fill.
        fill={favourited ? 'currentColor' : 'none'}
        strokeWidth={favourited ? 0 : 2}
      />
    </button>
  )
}
