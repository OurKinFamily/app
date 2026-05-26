const TYPE_LABELS = {
  sports_team: 'Sports Team',
  fitness: 'Fitness',
  hobby_club: 'Hobby / Club',
  school_class: 'School Class',
  school: 'School',
  extracurricular: 'Extracurricular',
  workplace: 'Workplace',
  professional_org: 'Professional Org',
  neighborhood: 'Neighborhood',
  religious: 'Religious',
  civic: 'Civic',
  family_friend: 'Family Friend',
  extended_network: 'Extended Network',
  camp: 'Camp',
}

export function typeLabel(type) {
  return TYPE_LABELS[type] || type
}

export function groupMeta(group) {
  return [typeLabel(group.type), group.location_name].filter(Boolean).join(' · ')
}
