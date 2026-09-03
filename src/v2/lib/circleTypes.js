/**
 * The vocabulary of somebody's social world.
 *
 * Copied from v1 rather than invented: these labels are already attached to
 * real groups in the graph, and renaming a type here would orphan them.
 *
 * The roles exist so that adding somebody to a school class offers "Student"
 * and "Teacher" rather than a blank box. A free-text role becomes twelve
 * spellings of "member" within a year.
 */

export const TYPE_LABELS = {
  sports_team: 'Sports Team', fitness: 'Fitness', hobby_club: 'Hobby / Club',
  school_class: 'School Class', school: 'School', extracurricular: 'Extracurricular',
  workplace: 'Workplace', professional_org: 'Professional Org',
  neighborhood: 'Neighborhood', religious: 'Religious', civic: 'Civic',
  family_friend: 'Family Friend', extended_network: 'Extended Network',
  camp: 'Camp',
}

export const TYPE_ROLES = {
  sports_team: ['Player', 'Coach', 'Assistant Coach', 'Manager', 'Referee', 'Parent'],
  fitness: ['Member', 'Instructor', 'Trainer'],
  hobby_club: ['Member', 'Leader', 'Organizer'],
  school_class: ['Student', 'Teacher', "Teacher's Aide", 'Classmate'],
  school: ['Student', 'Teacher', 'Administrator', 'Staff', 'Parent'],
  extracurricular: ['Member', 'Leader', 'Advisor', 'Coach'],
  workplace: ['Colleague', 'Manager', 'Direct Report', 'Contractor'],
  professional_org: ['Member', 'Officer', 'Board Member'],
  neighborhood: ['Neighbor', 'Organizer'],
  religious: ['Member', 'Leader', 'Volunteer'],
  civic: ['Member', 'Officer', 'Volunteer'],
  camp: ['Camper', 'Counselor', 'Staff', 'Director'],
  family_friend: ['Friend', 'Family Friend', 'Parent'],
  extended_network: ['Acquaintance', 'Contact'],
}

export const typeLabel = type => TYPE_LABELS[type] || type

/** "School Class · 1978 · Perkiomen Valley" — whatever of it is known. */
export const describeGroup = g =>
  [typeLabel(g.type), g.year, g.location_name].filter(Boolean).join(' · ')
