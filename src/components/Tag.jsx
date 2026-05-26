import { cn } from '../lib/cn'

// Tones. Pill variant uses bg + colored text; plain variant uses colored text only.
const TONE_PILL = {
  default: 'bg-white/5    text-white/40   border-white/15',
  green:   'bg-green-500/15  text-green-400  border-green-500/35',
  amber:   'bg-amber-500/15  text-amber-400  border-amber-500/35',
  red:     'bg-red-500/15    text-red-400    border-red-500/35',
  blue:    'bg-blue-500/15   text-blue-400   border-blue-500/35',
  purple:  'bg-purple-500/15 text-purple-400 border-purple-500/35',
  pink:    'bg-pink-500/15   text-pink-400   border-pink-500/35',
  orange:  'bg-orange-500/15 text-orange-400 border-orange-500/35',
  slate:   'bg-slate-500/15  text-slate-400  border-slate-500/35',
  cyan:    'bg-cyan-500/15   text-cyan-400   border-cyan-500/35',
}

const TONE_PLAIN = {
  default: 'text-white/40',
  green:   'text-green-400',
  amber:   'text-amber-400',
  red:     'text-red-400',
  blue:    'text-blue-400',
  purple:  'text-purple-400',
  pink:    'text-pink-400',
  orange:  'text-orange-400',
  slate:   'text-slate-400',
  cyan:    'text-cyan-400',
}

// Small label.
//   variant="pill"  (default) — colored pill with padding. Use for status badges,
//                                confidence chips, type labels.
//   variant="plain"            — color-only inline text. Use for subtle row meta.
// `tone` picks from the preset palette (default = neutral white/40).
// `color` overrides the tone with a custom value (hex, rgb, named) — bg gets
// ~15% of it, text is full, border is ~35%. Uses CSS color-mix for the alpha.
export function Tag({ children, tone = 'default', variant = 'pill', color, className }) {
  const customStyle = color
    ? (variant === 'plain'
        ? { color }
        : {
            backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
            color,
            borderColor:     `color-mix(in srgb, ${color} 35%, transparent)`,
          })
    : undefined

  if (variant === 'plain') {
    return (
      <span
        style={customStyle}
        className={cn('font-normal', !color && (TONE_PLAIN[tone] || TONE_PLAIN.default), className)}
      >
        {children}
      </span>
    )
  }
  return (
    <span
      style={customStyle}
      className={cn('rounded-full border px-2 py-0.5 text-[10px]', !color && (TONE_PILL[tone] || TONE_PILL.default), className)}
    >
      {children}
    </span>
  )
}
