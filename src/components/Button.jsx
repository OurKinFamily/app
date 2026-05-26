import { cva } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-white/10 text-white hover:bg-white/15',
        secondary: 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white',
        ghost: 'text-white/50 hover:bg-white/5 hover:text-white',
        danger: 'bg-red-600/80 text-white hover:bg-red-600',
      },
      size: {
        sm: 'px-3 py-1.5 text-[13px]',
        md: 'px-4 py-2 text-[13px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export function Button({ variant, size, className, ...props }) {
  return <button {...props} className={cn(button({ variant, size }), className)} />
}
