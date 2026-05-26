import { cn } from '../lib/cn'

// Color swatch row — chip + label + hex. For the Colors section (dominant/mean/salient).
export function Swatch({ color, label, className }) {
  if (!color) return null
  return (
    <div className={cn('mb-1.5 flex items-center gap-2', className)}>
      <div className="h-3.5 w-3.5 shrink-0 rounded border border-white/10" style={{ background: color }} />
      <span className="text-[11px] text-white/30">{label}</span>
      <span className="ml-auto font-mono text-[11px] text-white/45">{color}</span>
    </div>
  )
}
