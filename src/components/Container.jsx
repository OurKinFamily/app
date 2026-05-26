import { cn } from '../lib/cn'

// Centered, max-width content column with responsive horizontal padding.
// Wraps a page's content so it doesn't sprawl on wide screens.
export function Container({ children, className }) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8', className)}>
      {children}
    </div>
  )
}
