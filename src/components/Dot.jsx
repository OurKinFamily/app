import { cn } from '../lib/cn'

// Wrap any element to overlay a small status dot in the top-right corner.
// Use for unread / active-state / has-attention indicators.
//
//   <Dot show color="red"><FiltersIconButton ... /></Dot>
//
// Children must accept being positioned in a `relative` wrapper.
const COLORS = {
  red:    'bg-red-500',
  yellow: 'bg-yellow-400',
  green:  'bg-emerald-400',
  blue:   'bg-sky-400',
  white:  'bg-white',
}

export function Dot({ show = true, color = 'red', size = 'sm', children, className }) {
  const dim = size === 'lg' ? 'h-2.5 w-2.5' : 'h-2 w-2'
  return (
    <span className={cn('relative inline-flex', className)}>
      {children}
      {show && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute -right-0.5 -top-0.5 rounded-full ring-2 ring-black',
            dim,
            COLORS[color] || COLORS.red,
          )}
        />
      )}
    </span>
  )
}
