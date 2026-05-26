import { cn } from '../../lib/cn'

// Inline grey label — e.g. a person's role within a group ("Student").
export function Badge({ children, className }) {
  return <span className={cn('text-sm font-normal text-white/40', className)}>{children}</span>
}
