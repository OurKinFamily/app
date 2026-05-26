import { Avatar } from './Avatar'

// Shared leading-visual resolver for entity components.
// Priority: avatar image > initials (from text) > icon node > nothing.
export function Leading({ avatar, icon, initials, text, size = 'md' }) {
  if (avatar) return <Avatar src={avatar} name={text} size={size} />
  if (initials) return <Avatar name={text} size={size} />
  if (icon) return <span className="shrink-0 text-zinc-400">{icon}</span>
  return null
}
