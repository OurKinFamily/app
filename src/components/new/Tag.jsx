import { cn } from '../../lib/cn'

const TONES = {
  default: 'bg-white/5 text-white/40',
  green: 'bg-green-500/15 text-green-400',
  amber: 'bg-amber-500/15 text-amber-400',
  red: 'bg-red-500/15 text-red-400',
  blue: 'bg-blue-500/15 text-blue-400',
}

// Small pill chip — detected objects, status badges, etc. `tone` sets the color.
export function Tag({ children, tone = 'default', className }) {
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px]', TONES[tone] || TONES.default, className)}>
      {children}
    </span>
  )
}
