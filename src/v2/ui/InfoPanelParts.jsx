import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { C } from './tokens'

/** The small pieces the info panel is built from. Separate file to keep the
 *  panel itself readable. */

export function Row({ icon: Icon, primary, secondary, onEdit }) {
  if (!primary && !secondary) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '9px 0' }}>
      <Icon size={16} style={{ color: C.muted, flex: '0 0 auto', marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, wordBreak: 'break-word' }}>{primary}</div>
        {secondary && (
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{secondary}</div>
        )}
      </div>
      {onEdit && (
        <IconBtn label="Edit" onClick={onEdit}><Pencil size={13} /></IconBtn>
      )}
    </div>
  )
}

export function IconBtn({ children, label, onClick }) {
  const [over, setOver] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [focus, setFocus] = useState(false)

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => { setOver(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onFocus={e => setFocus(e.target.matches(':focus-visible'))}
      onBlur={() => { setFocus(false); setPressed(false) }}
      // Keyboard activation fires no mousedown, so the pressed state has to
      // come from the keys too or holding Space looks inert.
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') setPressed(true) }}
      onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') setPressed(false) }}
      style={{
        display: 'grid', placeItems: 'center', width: 22, height: 22,
        flex: '0 0 auto', border: 0, borderRadius: '50%',
        background: pressed ? C.border : (over || focus) ? C.hover : 'transparent',
        color: over || focus ? C.text : C.muted,
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        cursor: 'pointer', outline: 'none',
        boxShadow: focus ? `0 0 0 2px ${C.activeText}` : undefined,
        transition: 'background 120ms ease, color 120ms ease, transform 80ms ease',
      }}
    >
      {children}
    </button>
  )
}


export function SectionLabel({ children, onEdit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, marginBottom: 4 }}>
      <span style={{ fontSize: 11.5, color: C.muted }}>{children}</span>
      <div style={{ flex: 1 }} />
      {onEdit && <IconBtn label="Edit" onClick={onEdit}><Pencil size={13} /></IconBtn>}
    </div>
  )
}

/** A face crop with a name under it, or a name alone when there's no crop. */


/**
 * One face: the crop, and who it is.
 *
 * `row` lays it out sideways — crop on the left, name and age on the right —
 * which is what a NAMED person wants: a full name fits without wrapping or
 * truncating, and the ages line up down the column so they can be read as a
 * set. Stacked, the name has only the width of the crop, and every option
 * there is bad: wrap and the faces sit at different heights, truncate and you
 * lose the point of the name, enlarge and the faces dominate a panel that is
 * mostly not about faces.
 *
 * Unnamed faces keep the stacked form. They have nothing to lay out beside
 * them, and a grid of crops is the right shape for "which of these is
 * somebody you know".
 */
export function Face({ src, name, sub, dim, row }) {
  const size = row ? 40 : 44
  const picture = (
    <div style={{
      width: size, height: size, flex: '0 0 auto',
      margin: row ? 0 : '0 auto',
      background: C.hover, overflow: 'hidden',
      borderRadius: 5, opacity: dim ? 0.85 : 1,
    }}>
      {src && (
        <img src={src} alt={name || ''} loading="lazy"
             style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  )

  if (!row) {
    return (
      <div style={{ width: 56 }}>
        {picture}
        {name && <div title={name} style={{
          fontSize: 10.5, lineHeight: 1.3, marginTop: 4, textAlign: 'center',
          color: dim ? C.muted : C.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
          {sub && <div style={{ color: C.muted, fontSize: 10 }}>{sub}</div>}
        </div>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      {picture}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, lineHeight: 1.3, color: dim ? C.muted : C.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </div>
        {sub && (
          <div style={{ color: C.muted, fontSize: 11, whiteSpace: 'nowrap' }}>{sub}</div>
        )}
      </div>
    </div>
  )
}

