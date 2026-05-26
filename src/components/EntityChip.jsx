import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'
import { Leading } from './Leading'

// Generic pill for any entity. Leading is optional (avatar | icon | initials | none).
// Provide `to` to render as a <Link>, or `onClick` to render as a <button>.
// Optional `caption` adds a smaller dim line below `text` (e.g. "PARENT",
// "born 1961"); pill grows in height to fit.
// Optional `onRemove` renders a small X in the top-right corner (shown on
// hover); click stops propagation so it doesn't trigger the chip's own click.
export function EntityChip({ avatar, icon, initials, text, caption, to, onClick, onRemove, removeLabel = 'Remove', className }) {
  const lead = Boolean(avatar || icon || initials)
  const classes = cn(
    'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 text-[13px] text-white transition-colors',
    caption ? 'py-1.5' : 'py-1',
    lead ? 'pl-1' : 'pl-3',
    'pr-3',
    (to || onClick) && 'hover:bg-white/10',
    className,
  )
  const inner = (
    <>
      {lead && <Leading avatar={avatar} icon={icon} initials={initials} text={text} size="sm" />}
      {caption ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate">{text}</span>
          <span className="truncate text-[10px] text-white/35">{caption}</span>
        </span>
      ) : (
        text
      )}
    </>
  )
  const chip = to
    ? <Link to={to} className={classes}>{inner}</Link>
    : (() => {
        const Comp = onClick ? 'button' : 'div'
        return <Comp onClick={onClick} className={classes}>{inner}</Comp>
      })()

  if (!onRemove) return chip

  // Wrap so the X can sit just outside the pill in the corner.
  return (
    <span className="group/chip relative inline-flex">
      {chip}
      <button
        type="button"
        aria-label={removeLabel}
        onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove() }}
        className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-white/40 transition-colors hover:text-red-400 group-hover/chip:flex"
      >
        <X size={10} />
      </button>
    </span>
  )
}
