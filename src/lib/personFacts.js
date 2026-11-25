/**
 * The life-event fields a person page shows, and whether any are filled in.
 *
 * The labels are the family-facing ones the archive has settled on — Passed,
 * Last home, Laid to rest, Arrived, Became citizen. Somebody's granddaughter
 * reads this page; "death_place" is for the database.
 *
 * Separate from the component so a caller can ask "is there anything here?"
 * before deciding to render a heading over nothing. For most people every one
 * of these is empty.
 */
export const FACT_FIELDS = [
  ['death_date', 'Passed', true],
  ['death_place', 'Last home'],
  ['burial_place', 'Laid to rest'],
  ['immigration_date', 'Arrived', 'year'],
  ['immigration_place', 'From / via'],
  ['naturalization_date', 'Became citizen', 'year'],
  ['naturalization_place', 'Took citizenship in'],
]

export function hasFacts(person) {
  if (!person) return false
  if (person.former_names?.length) return true
  if (person.notes) return true
  return FACT_FIELDS.some(([key]) => person[key])
}
