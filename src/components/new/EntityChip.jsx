import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Leading } from './Leading'

// Generic pill for any entity. Leading is optional (avatar | icon | initials | none).
// Provide `to` to render as a <Link>, or `onClick` to render as a <button>.
export function EntityChip({ avatar, icon, initials, text, to, onClick, className }) {
  const lead = Boolean(avatar || icon || initials)
  const classes = cn(
    'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pr-3 text-[13px] text-white transition-colors',
    lead ? 'pl-1' : 'pl-3',
    (to || onClick) && 'hover:bg-white/10',
    className,
  )
  const inner = (
    <>
      {lead && <Leading avatar={avatar} icon={icon} initials={initials} text={text} size="sm" />}
      {text}
    </>
  )
  if (to) return <Link to={to} className={classes}>{inner}</Link>
  const Comp = onClick ? 'button' : 'div'
  return <Comp onClick={onClick} className={classes}>{inner}</Comp>
}
