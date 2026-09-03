import { C } from './tokens'

/**
 * A labelled text input, the same shape in every dialog.
 *
 * The "optional" marker is spelled out rather than implied by the absence of
 * an asterisk. Half the fields on a person are optional and a family archive
 * gets filled in over years, in fragments — being told plainly that a birth
 * year can wait is the difference between adding somebody and giving up.
 */
export function Field({ label, optional, value, onChange, placeholder, autoFocus, onEnter }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 11.5, color: C.muted, marginBottom: 4 }}>
        {label}
        {optional && <span style={{ marginLeft: 5 }}>optional</span>}
      </span>
      <input
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }}
        style={{
          width: '100%', boxSizing: 'border-box', height: 34, padding: '0 11px',
          border: `1px solid ${C.border}`, borderRadius: 9,
          font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
        }}
      />
    </label>
  )
}

/** Two or more choices where exactly one is on. */
export function Choices({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 3, padding: 3, marginBottom: 14,
      borderRadius: 12, background: C.surface,
    }}>
      {options.map(opt => {
        const on = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.title}
            style={{
              flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, height: 30, borderRadius: 9, font: 'inherit', fontSize: 12.5,
              border: 0, cursor: 'pointer',
              background: on ? C.bg : 'transparent',
              color: on ? C.activeText : C.muted,
              boxShadow: on ? '0 1px 3px rgba(0,0,0,.12)' : 'none',
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/** Something the reader should know before they act, not an error. */
export function Note({ children, tone = 'warn' }) {
  const colours = tone === 'warn'
    ? { bg: '#fef7e0', fg: '#a15c00' }
    : { bg: '#fce8e6', fg: '#c5221f' }

  return (
    <p style={{
      margin: '0 0 14px', padding: '9px 12px', borderRadius: 9,
      fontSize: 12.5, lineHeight: 1.5,
      background: colours.bg, color: colours.fg,
    }}>
      {children}
    </p>
  )
}
