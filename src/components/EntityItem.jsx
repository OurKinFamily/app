import { cn } from '../lib/cn'
import { Leading } from './Leading'
import { Tag } from './Tag'

// Generic list/card item for any entity. Knows layout, not domain.
// Horizontal: lead | text+badge / secondary | trailing.
// Works as a row in a stack OR as a cell in a grid (auto-fill columns).
export function EntityItem({ avatar, icon, initials, text, badge, secondary, trailing, onClick, className }) {
  const lead = Boolean(avatar || icon || initials)
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-left transition-colors',
        onClick && 'cursor-pointer hover:bg-white/8',
        className,
      )}
    >
      {lead && <Leading avatar={avatar} icon={icon} initials={initials} text={text} size="lg" />}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-white">
          {text}
          {badge && <Tag variant="plain" className="ml-2">{badge}</Tag>}
        </div>
        {secondary && <div className="truncate text-sm text-white/50">{secondary}</div>}
      </div>
      {trailing && <div className="shrink-0 text-sm text-white/30">{trailing}</div>}
    </Comp>
  )
}
