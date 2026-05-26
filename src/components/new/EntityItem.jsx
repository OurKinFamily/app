import { cn } from '../../lib/cn'
import { Leading } from './Leading'
import { Tag } from './Tag'

// Generic list/card item for any entity. Knows layout, not domain.
//   variant="row"  (default) — horizontal: lead | text+badge / secondary | trailing
//                              Compact, use for list rows.
//   variant="card"           — vertical stack: lead on top, text+badge, secondary,
//                              trailing at bottom. Use inside grids.
export function EntityItem({ avatar, icon, initials, text, badge, secondary, trailing, variant = 'row', onClick, className }) {
  const lead = Boolean(avatar || icon || initials)
  const Comp = onClick ? 'button' : 'div'

  if (variant === 'card') {
    return (
      <Comp
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-4 rounded-xl border border-white/8 bg-white/5 p-4 text-left transition-colors',
          onClick && 'cursor-pointer hover:bg-white/8',
          className,
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm text-white">
            {text}
            {badge && <Tag variant="plain" className="ml-2">{badge}</Tag>}
          </div>
          {secondary && <div className="mt-0.5 truncate text-[12px] text-white/50">{secondary}</div>}
          {trailing && <div className="mt-1 text-[12px] text-white/30">{trailing}</div>}
        </div>
        {lead && <Leading avatar={avatar} icon={icon} initials={initials} text={text} size="xl" />}
      </Comp>
    )
  }

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
