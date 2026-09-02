import { C } from './tokens'

/**
 * A person's face, or their initials.
 *
 * Shared by the grid card and the list row so a person looks the same in both.
 * Initials are the common case — 144 of 523 people have no portrait — so the
 * fallback gets a colour picked by hashing the name, and keeps it between
 * visits. An avatar that changes on every load is worse than no avatar.
 */

const TONES = [
  '#e8eaf6', '#e0f2f1', '#fff3e0', '#fce4ec',
  '#e8f5e9', '#ede7f6', '#e1f5fe', '#fff8e1',
]

function toneFor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 9973
  return TONES[h % TONES.length]
}

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (parts[0][0] + last).toUpperCase()
}

export function Avatar({ name, src, size = 68 }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', display: 'block',
          background: C.hover, flex: '0 0 auto',
        }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'grid', placeItems: 'center',
        width: size, height: size, borderRadius: '50%',
        background: toneFor(name), color: C.muted,
        fontSize: size * 0.32, fontWeight: 500, letterSpacing: '.02em',
        flex: '0 0 auto',
      }}
    >
      {initialsOf(name)}
    </span>
  )
}
