import { memo } from 'react'
import { Avatar } from './Avatar'
import { C } from './tokens'

/**
 * One person, as a face and a name.
 *
 * A round avatar rather than a rectangle: it is the shape every photo app uses
 * for a person, and it reads as a person at a glance in a grid that also holds
 * albums and photographs.
 *
 * Small on purpose. 523 people is a page you scan rather than read, and the
 * face is doing the work — a bigger tile means fewer per screen and more
 * scrolling to find the one you want.
 */
function PersonCardBase({ name, secondary, avatar, size = 54, onClick }) {
  return (
    <button
      type="button"
      // A hook for the end-to-end tests: the toolbar's view toggles are
      // buttons inside <main> too, and "the first button" found one of those
      // rather than a person.
      data-testid="person-card"
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6, padding: '8px 4px', width: '100%',
        border: 0, borderRadius: 10, background: 'transparent',
        font: 'inherit', color: 'inherit', cursor: 'pointer',
      }}
    >
      <Avatar name={name} src={avatar} size={size} />

      <span style={{ minWidth: 0, width: '100%', textAlign: 'center' }}>
        <span
          style={{
            display: 'block', fontSize: 12, color: C.text, lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
          title={name}
        >
          {name}
        </span>
        {secondary && (
          <span style={{
            display: 'block', fontSize: 10.5, color: C.muted, marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {secondary}
          </span>
        )}
      </span>
    </button>
  )
}

export const PersonCard = memo(PersonCardBase)
