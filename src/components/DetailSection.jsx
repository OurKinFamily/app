import { cn } from '../../lib/cn'

// One labeled block in a detail panel — uppercase label + a top divider.
export function DetailSection({ title, children, className }) {
  return (
    <section className={cn('mt-3 border-t border-white/[0.07] pt-3 first:mt-0 first:border-0 first:pt-0', className)}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/25">{title}</p>
      {children}
    </section>
  )
}
