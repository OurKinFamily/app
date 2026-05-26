import { cn } from '../../lib/cn'

// Label ↔ value row for detail panels. Renders nothing when value is empty.
// Optional `icon` sits just left of the value.
export function Field({ label, value, icon, className }) {
  if (value == null || value === '') return null
  return (
    <div className={cn('mb-1.5 flex justify-between gap-3', className)}>
      <span className="shrink-0 text-[11px] text-white/30">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-1.5 break-all text-right text-[11px] text-white/65">
        {icon && <span className="shrink-0 text-white/40">{icon}</span>}
        {value}
      </span>
    </div>
  )
}
