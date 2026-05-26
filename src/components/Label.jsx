import { cn } from '../lib/cn'

// Form label. `required` shows a red *, optional `hint` (e.g. "(optional)") dimmer after.
export function Label({ children, htmlFor, hint, required, className }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-[12px] text-white/40', className)}>
      {children}
      {required && <span className="ml-0.5 text-red-400">*</span>}
      {hint && <span className="ml-1 text-white/20">{hint}</span>}
    </label>
  )
}
