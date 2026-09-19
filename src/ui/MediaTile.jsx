import {
  createContext, useContext, useState, useRef, useEffect, memo,
  Children, isValidElement,
} from 'react'
import { Play } from 'lucide-react'
import { C } from './tokens'
import { CONTROL_ATTR, demoteControls, handleControlKeys } from './tileControls'
import { useLongPress, usePrefersReducedMotion } from './hooks'
import { TileControl } from './TileControl'
import { TileCheckbox } from './TileCheckbox'
import { TileFavourite } from './TileFavourite'

/**
 * The one tile. Everywhere media is shown in a list or grid, this renders it.
 *
 * Deliberately dumb: it takes explicit props rather than a media item, so it
 * can serve gallery photos, face crops, heritage documents and search hits
 * alike — things with different shapes that all need a picture in a box. Use
 * `mediaTileProps(item)` when you do have a gallery item.
 *
 * It imposes no size. The parent gives it a box (the grid has already worked
 * out row heights and tile widths) and the tile fills it exactly.
 *
 * Structure is load-bearing:
 *
 *   <figure>            positioning context, carries the colour ground
 *     <img>             fades in over the colour
 *     <button>          the click target — a real button, filling the tile
 *     <Top/Bottom>      overlays, SIBLINGS of the button, not children
 *
 * The overlays sit outside the button because they contain their own buttons
 * (checkbox, menu) and nesting interactive elements inside a button is invalid
 * HTML — screen readers and keyboards both handle it badly.
 */

const TileContext = createContext({ hovered: false, focusWithin: false, selectionMode: false })

// Shared with CollectionCard — see tileControls.js.

// ── overlay slots ───────────────────────────────────────────────────────────

function slotStyle(edge, blockClicks, hovered) {
  return {
    position: 'absolute',
    left: 0,
    right: 0,
    [edge]: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: 2,
    // Fixed so controls appearing on hover can't change the band's height and
    // shift everything already in it.
    minHeight: 34,
    boxSizing: 'border-box',
    // Scrim only behind the overlay, so icons stay legible on a pale photo
    // without dimming the whole image.
    // The top band deepens on hover: that's when its controls appear, and they
    // need to stay legible over a bright photo.
    background:
      edge === 'top'
        ? `linear-gradient(to bottom, rgba(0,0,0,${hovered ? 0.65 : 0.45}), transparent)`
        : 'linear-gradient(to top, rgba(0,0,0,.45), transparent)',

    // The top band holds controls, so it stops being part of the photo's click
    // target — hovering the gap between two icons shows an arrow, not a hand,
    // and clicking there does nothing rather than opening the photo by
    // accident. The bottom band stays click-through: it carries labels like a
    // video's duration, which are part of the picture, not controls.
    pointerEvents: blockClicks ? 'auto' : 'none',
    cursor: blockClicks ? 'default' : undefined,
    zIndex: 2,
  }
}

function Slot({ edge, children, justify, blockClicks }) {
  const { hovered } = useContext(TileContext)
  const kids = Children.toArray(children).filter(Boolean)
  if (!kids.length) return null
  return (
    <div style={{ ...slotStyle(edge, blockClicks, hovered), justifyContent: justify || 'flex-start' }}>
      {kids.map((k, i) => (
        <span
          key={i}
          {...{ [CONTROL_ATTR]: edge }}
          style={{ pointerEvents: 'auto', display: 'inline-flex' }}
        >
          {k}
        </span>
      ))}
    </div>
  )
}

function Top({ children, justify }) {
  return <Slot edge="top" justify={justify} blockClicks>{children}</Slot>
}
function Bottom({ children, justify }) {
  return <Slot edge="bottom" justify={justify}>{children}</Slot>
}

/**
 * Shows its children only while the tile is hovered.
 *
 * Driven by React state rather than CSS :hover because the slots need to know
 * too — but the state lives on the tile, so one mouseover re-renders one tile,
 * not the grid.
 */
function OnHover({ children }) {
  const { hovered, focusWithin, selectionMode } = useContext(TileContext)
  // Focus counts as hover, or a keyboard user could never reach a control that
  // only exists while a mouse is over it. So does selection mode: touch devices
  // have no hover at all, and without this the checkbox is literally
  // unreachable on a phone.
  if (!hovered && !focusWithin && !selectionMode) return null
  return children
}



// ── the tile ────────────────────────────────────────────────────────────────

function MediaTileBase({
  src,
  alt,
  color = '#e8e8e8',
  isVideo = false,
  // Set by the grid for tiles that are above the fold on first paint. Those
  // must NOT be lazy: a lazy image is only requested once layout says it's
  // visible, which puts a whole round trip after layout and delays the largest
  // contentful paint on every single page load. The tile can't work out what's
  // above the fold — only the grid knows the rows.
  priority = false,
  selected = false,
  onClick,
  onToggleSelect,
  // Set by the grid. In selection mode every tile shows its controls and a tap
  // selects rather than opens — the only workable model on touch, where there
  // is no hover and a tap would otherwise always mean "open".
  selectionMode = false,
  // Fired by a press-and-hold. The grid turns this into selection mode; the
  // tile has no opinion about what it means.
  onLongPress,
  className,
  style,
  children,
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const figureRef = useRef(null)
  const { consume: consumeLongPress, handlers: pressHandlers } = useLongPress(onLongPress)
  const reduceMotion = usePrefersReducedMotion()

  // Tab moves tile-to-tile, never into one: controls are reached with the arrow
  // keys instead (roving tabindex). Enforced here rather than by passing
  // tabIndex down, because slot children are arbitrary and often wrapped —
  // OnHover swallowed the prop, which let every control back into the tab
  // order and made Tab alternate tile, icon, tile, icon.
  useEffect(() => { demoteControls(figureRef.current) })

  // Split children into the two slots. Anything that isn't a slot is rendered
  // as-is, so a caller can drop in a badge without ceremony.
  const kids = Children.toArray(children)
  const top = kids.filter(k => isValidElement(k) && k.type === Top)
  const bottom = kids.filter(k => isValidElement(k) && k.type === Bottom)
  const loose = kids.filter(k => !isValidElement(k) || (k.type !== Top && k.type !== Bottom))

  return (
    <TileContext.Provider value={{ hovered, focusWithin, selectionMode }}>
      <figure
        ref={figureRef}
        className={className}
        data-testid="gallery-item"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        // React's onFocus/onBlur bubble, so these fire for the controls too.
        // Only KEYBOARD focus counts as hover. Any focus would do it too, but
        // then clicking the heart leaves the checkbox stuck on after the
        // pointer has moved away — the click focused the button.
        onFocus={e => setFocusWithin(e.target.matches(':focus-visible'))}
        onBlur={e => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFocusWithin(false)
        }}
        // Up enters the top band, Down the bottom — the direction the
        // controls actually sit in.
        onKeyDown={e => handleControlKeys(e, figureRef.current)}
        style={{
          position: 'relative',
          margin: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          // The dominant colour stands in until the photo arrives, and stays
          // put if it never does — a coloured rectangle degrades far better
          // than a broken-image glyph. Selected tiles show the page ground
          // instead, since that's what the inset image is revealing.
          // The page shows through the margin the inset leaves behind.
          background: selected ? C.bg : 'transparent',
          // No radius, no border, by decision.
          // No outline here: the scaling wrapper below is a child, and children
          // paint above their parent's outline, so it was drawn and then
          // covered. The ring is rendered as a top-most element instead.
          ...style,
        }}
      >
        {/* Everything scales together — image, play badge, click target and
            overlay bands — so a selected tile shrinks as one object rather
            than the photo sliding out from under its own controls. The figure
            keeps its full size, so the grid's layout never moves. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: color,
            overflow: 'hidden',
            transform: selected ? 'scale(0.86)' : 'scale(1)',
            transition: reduceMotion ? 'none' : 'transform 160ms ease',
          }}
        >
          {src && !failed && (
            <img
              src={src}
              alt=""                     /* the button carries the label */
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                opacity: loaded ? 1 : 0,
                transition: reduceMotion ? 'none' : 'opacity 200ms ease',
              }}
            />
          )}

          {isVideo && (
            // Purely a signal that this is a video. Not a click target — the
            // whole tile is one target, so there's one rule rather than two.
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, display: 'grid',
                placeItems: 'center', pointerEvents: 'none', zIndex: 1,
              }}
            >
              <span
                style={{
                  display: 'grid', placeItems: 'center',
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(0,0,0,.45)', color: '#fff',
                }}
              >
                <Play size={20} fill="currentColor" strokeWidth={0} />
              </span>
            </span>
          )}

          {/* A real button: tab-reachable, Enter and Space for free, and an
              accessible name without a redundant <img alt> announcing twice. */}
          <button
            type="button"
            {...pressHandlers}
          onClick={e => {
            // A long press already did its job; the click the browser fires
            // afterwards must not also open the photo.
            if (consumeLongPress()) return
            // Hand the event on: only the grid knows what a range is, and it
            // needs the modifier keys to decide. Without this, shift-click did
            // nothing at all inside selection mode.
            if (selectionMode) onToggleSelect?.(!selected, e)
            else onClick?.(e)
          }}
            // :focus-visible rather than :focus, so clicking a tile with the
            // mouse doesn't leave a ring behind — only keyboard navigation does.
            onFocus={e => setFocused(e.target.matches(':focus-visible'))}
            onBlur={() => setFocused(false)}
            aria-label={alt}
            aria-pressed={onToggleSelect ? selected : undefined}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              border: 0, padding: 0, margin: 0,
              background: 'transparent',
              cursor: onClick ? 'pointer' : 'default',
              // The figure draws the focus ring (an outline here would be clipped
              // by overflow:hidden), so suppress the browser's own — otherwise
              // both render and you get a black ring inside the blue one.
              outline: 'none',
              zIndex: 1,
            }}
          />

          {top}
          {bottom}
          {loose}
        </div>

        {/* Focus ring, above everything and outside the scaling wrapper. It
            marks the TILE, which keeps its footprint even when selection
            shrinks the picture inside it. Can't be an outline on the figure:
            children paint above their parent's outline, so the wrapper covered
            it and tabbing looked like nothing happened. */}
        {focused && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              border: `3px solid ${C.activeText}`,
              pointerEvents: 'none', zIndex: 5,
            }}
          />
        )}

      </figure>
    </TileContext.Provider>
  )
}

/**
 * Memoised: a grid holds thousands of these, and without it any parent state
 * change re-renders every tile on screen.
 *
 * It only helps if the caller keeps props stable. `children` is the trap —
 * fresh JSX on every render is a new object, so an unmemoised grid defeats
 * this entirely. The grid must memoise its per-item render.
 */
export const MediaTile = memo(MediaTileBase)

MediaTile.Top = Top
MediaTile.Bottom = Bottom
MediaTile.OnHover = OnHover
MediaTile.Control = TileControl
MediaTile.Checkbox = TileCheckbox
MediaTile.Favourite = TileFavourite
