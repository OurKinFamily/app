import { cn } from '../../lib/cn'

export function Input({ className, error, ...props }) {
  return (
    <input
      {...props}
      aria-invalid={error || undefined}
      className={cn(
        'w-full rounded-lg border bg-white/5 px-3 py-2 text-base text-white caret-white placeholder-white/25 outline-none transition-colors md:text-[13px]',
        error ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-white/30',
        className,
      )}
    />
  )
}
