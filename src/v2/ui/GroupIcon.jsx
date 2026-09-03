import {
  Briefcase, Building2, Church, Dumbbell, GraduationCap, Home, Landmark,
  Palette, School, Sparkles, Tent, Trophy, Users, Users2,
} from 'lucide-react'

/**
 * The icon for a kind of group.
 *
 * Fourteen types is too many to tell apart by a text label in a list, and the
 * icon is what makes a school scannable against a workplace at a glance.
 * Copied from v1 rather than invented: the types are already attached to real
 * groups, and a different icon for the same word would be its own small lie.
 */
const ICONS = {
  sports_team: Trophy,
  fitness: Dumbbell,
  hobby_club: Palette,
  school_class: GraduationCap,
  school: School,
  extracurricular: Sparkles,
  workplace: Briefcase,
  professional_org: Building2,
  neighborhood: Home,
  religious: Church,
  civic: Landmark,
  family_friend: Users,
  extended_network: Users2,
  camp: Tent,
}

export function GroupIcon({ type, size = 16, color }) {
  const Icon = ICONS[type] || Users
  return <Icon size={size} color={color} />
}
