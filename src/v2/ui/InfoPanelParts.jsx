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


export function Face({ src, name, sub, dim }) {
  return (
    <div style={{ width: 44 }}>
      <div style={{
        width: 44, height: 44, background: C.hover, overflow: 'hidden',
        borderRadius: 5, opacity: dim ? 0.85 : 1,
      }}>
        {src && (
          <img src={src} alt={name || ''} loading="lazy"
               style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
      {/* Names wrap rather than truncate. "Amelia Rose Young" cut to "Amelia
          Ro…" is worse than two short lines — and in a family archive the
          whole point of the name is that it is the right person. */}
      {name && <div style={{
        fontSize: 10.5, lineHeight: 1.25, marginTop: 4, textAlign: 'center',
        color: dim ? C.muted : C.text,
        overflowWrap: 'break-word',
      }}>
        {name}
        {sub && (
          <div style={{ color: C.muted, fontSize: 10 }}>{sub}</div>
        )}
      </div>}
    </div>
  )
}
