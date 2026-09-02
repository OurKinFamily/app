import { createContext, memo, useContext, useEffect, useRef, useState } from 'react'
import { C } from './tokens'
import { CONTROL_ATTR, demoteControls, handleControlKeys } from './tileControls'

const CardContext = createContext({ hovered: false, focusWithin: false })

/**
 * Controls that appear on hover — the same bargain MediaTile strikes.
 *
 * Keyboard focus counts as hover, or a keyboard user could never reach a
 * control that only exists while a mouse is over it. Driven by React state
 * rather than CSS :hover because the slot has to know too, and the state lives
 * on the card, so one mouseover re-renders one card rather than the grid.
 */
function OnHover({ children }) {
  const { hovered, focusWithin } = useContext(CardContext)
  if (!hovered && !focusWithin) return null
  return children
}

/**
 * One collection: an album, a journal, a yearbook, a box of scans.
 *
 * A media tile shows one photograph; this shows a container of them, and the
 * difference has to be legible at a glance in a grid where both might appear.
 * Hence the stack — two sheets peeking out behind the cover, saying "there is
 * more inside" before any label is read.
 *
 * Deliberately the same shape as MediaTile: presentational, told rather than
 * asking, with children as slots. It knows nothing about albums, scrapbooks or
 * routing; the page supplies the words and the handlers. That is what lets
 * Scrapbook, Albums and a person's collections all use it.
 *
 * Two layouts, identical props — `layout="row"` is a drop-in for a list view,
 * so a view toggle is a one-word change rather than a second component.
 */

const COVER_RATIO = '4 / 3'

// How far each sheet of the stack steps back, and the room reserved for them
// inside the cover box. Kept small: the stack is a hint that there is more
// inside, not a decoration to be noticed.
const STACK_STEP = 3
const STACK_ROOM = 6

function Cover({ cover, alt, color, icon: Icon, stacked, layout }) {
  const row = layout === 'row'
  return (
    <div
      style={{
        position: 'relative',
        width: row ? 108 : '100%',
        aspectRatio: row ? '1 / 1' : COVER_RATIO,
        flex: row ? '0 0 auto' : undefined,
      }}
    >
      {/* The stack. Purely decorative, and behind the cover: an album with one
          photograph in it should still read as a container. */}
      {stacked && !row && [2, 1].map(i => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            // A staircase down and to the right, each sheet inset from the
            // last. Offsetting up-and-right read as a duplicate that had
            // slipped rather than a pile of things.
            position: 'absolute',
            top: i * STACK_STEP,
            left: i * STACK_STEP,
            right: STACK_ROOM - i * STACK_STEP,
            bottom: STACK_ROOM - i * STACK_STEP,
            borderRadius: 10,
            background: i === 1 ? '#eceff1' : '#f5f6f7',
            border: `1px solid ${C.border}`,
          }}
        />
      ))}

      <div
        style={{
          // The cover sits at the front of the stack, leaving the sheets room
          // to show along two edges.
          position: 'absolute',
          top: 0, left: 0,
          right: stacked && !row ? STACK_ROOM : 0,
          bottom: stacked && !row ? STACK_ROOM : 0,
          borderRadius: 10, overflow: 'hidden',
          // The dominant colour stands in until the image decodes, so a grid
          // of covers does not flash grey.
          background: color || C.hover,
          border: `1px solid ${C.border}`,
        }}
      >
        {cover
          ? <img
              src={cover}
              alt={alt || ''}
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          : Icon && (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: C.muted }}>
              <Icon size={row ? 22 : 28} />
            </div>
          )}
      </div>
    </div>
  )
}

function CollectionCardBase({
  title,
  subtitle,
  description,
  count,
  countLabel = 'item',
  cover,
  coverAlt,
  color,
  icon,
  stacked = true,
  layout = 'grid',
  onClick,
  children,
}) {
  const row = layout === 'row'
  const rootRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)

  // Controls are out of the tab order and reached with arrows instead, so Tab
  // crosses a grid of collections one card per keystroke.
  useEffect(() => { demoteControls(rootRef.current) })

  const counted = count != null
    ? `${count.toLocaleString()} ${countLabel}${count === 1 ? '' : 's'}`
    : null

  return (
    <CardContext.Provider value={{ hovered, focusWithin }}>
    <div
      ref={rootRef}
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Focus bubbles, so this fires for the controls too — which is how a
      // keyboard user keeps them visible while stepping along them. Only
      // KEYBOARD focus counts: a click focuses the button, and treating that
      // as hover leaves controls stuck on after the pointer has left.
      onFocus={e => setFocusWithin(e.target.matches(':focus-visible'))}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocusWithin(false)
      }}
      // Up enters the controls; Left/Right walk along them; Escape comes back.
      onKeyDown={e => handleControlKeys(e, rootRef.current, { ArrowUp: 'top' })}
    >
      <button
        type="button"
        onClick={onClick}
        onFocus={e => setFocused(e.target.matches(':focus-visible'))}
        onBlur={() => setFocused(false)}
        style={{
          display: 'flex',
          flexDirection: row ? 'row' : 'column',
          alignItems: row ? 'center' : 'stretch',
          gap: row ? 14 : 10,
          width: '100%', padding: row ? 8 : 0,
          border: 0, borderRadius: 12, background: 'transparent',
          textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
          font: 'inherit', color: 'inherit',
          // The ring is drawn as a sibling below, so the button must not draw
          // its own: both render and you get a black ring inside the blue one.
          outline: 'none',
        }}
      >
        <Cover
          cover={cover} alt={coverAlt} color={color}
          icon={icon} stacked={stacked} layout={layout}
        />

        <div style={{ minWidth: 0, flex: row ? 1 : undefined, padding: row ? 0 : '0 2px' }}>
          <div
            style={{
              fontSize: 14, fontWeight: 500, color: C.text, lineHeight: 1.3,
              // One line, ellipsed. A yearbook's full title runs to nine words
              // and would otherwise push every card in the row out of line.
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title={title}
          >
            {title}
          </div>

          {(subtitle || counted) && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {[subtitle, counted].filter(Boolean).join(' · ')}
            </div>
          )}

          {description && (
            <p style={{
              fontSize: 12, color: C.muted, margin: '4px 0 0', lineHeight: 1.45,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {description}
            </p>
          )}
        </div>
      </button>

      {/* Controls sit outside the button: nesting one button inside another is
          invalid, and it is the same reason MediaTile keeps its overlays as
          siblings of the click target. */}
      {children}

      {/* Focus ring, above everything and matching the media tile exactly:
          3px of the accent colour around the whole item. Drawn as a top-most
          element rather than an outline on the card, because children paint
          above their parent's outline and would cover it. */}
      {focused && (
        <span
          aria-hidden="true"
          style={{
            // Outside the content, not tight against it: a 3px ring drawn on
            // the card's own edge sat a pixel off the cover's corner radius
            // and read as a second, wonkier border.
            position: 'absolute', inset: -5,
            border: `3px solid ${C.activeText}`,
            borderRadius: 14,
            pointerEvents: 'none', zIndex: 5,
          }}
        />
      )}
    </div>
    </CardContext.Provider>
  )
}

/**
 * Top-right of the cover: a lock, a menu, whatever the page needs there.
 *
 * Hidden until the card is hovered or holds keyboard focus. Marked with the
 * control attribute so arrow-key navigation can find whatever is inside it
 * without knowing what it is.
 */
function Actions({ children }) {
  return (
    <OnHover>
      <div
        {...{ [CONTROL_ATTR]: 'top' }}
        style={{
          position: 'absolute', top: 12, right: 8,
          display: 'flex', gap: 4, zIndex: 1,
        }}
      >
        {children}
      </div>
    </OnHover>
  )
}

export const CollectionCard = memo(CollectionCardBase)
CollectionCard.Actions = Actions
CollectionCard.OnHover = OnHover
