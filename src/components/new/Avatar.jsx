import { cn } from '../../lib/cn'

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

const SIZES = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-10 h-10 text-sm',
  lg: 'w-11 h-11 text-sm',
}

export function Avatar({ src, name = '', size = 'md', className }) {
  const base = cn('shrink-0 rounded-full ring-1 ring-white/10', SIZES[size] || SIZES.md, className)

  if (src) {
    return <img src={src} alt={name} className={cn(base, 'object-cover')} />
  }
  return (
    <div className={cn(base, 'bg-white/10 flex items-center justify-center text-white/60 font-medium')}>
      {initials(name)}
    </div>
  )
}
