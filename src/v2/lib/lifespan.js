/**
 * The line under a person's name.
 *
 * Dates rather than labels. This is a family archive and many of the people in
 * it have passed; "1932 – 2001" says so quietly, where a DECEASED flag or a
 * "Died" label says it the way a database would.
 *
 * A nickname wins over dates when there is one, because that is what the family
 * would actually call them.
 */
export function lifespan(person) {
  const born = year(person.birth_date)
  const died = year(person.death_date)
  if (born && died) return `${born} – ${died}`
  if (born) return person.is_living === false ? `b. ${born}` : `b. ${born}`
  if (died) return `d. ${died}`
  return null
}

/** What to show beneath a name: their other name, else their years. */
export function personSubtitle(person) {
  const other = person.known_as && person.known_as !== person.name ? person.name : null
  return other || lifespan(person)
}

const year = d => (typeof d === 'string' && d.length >= 4 ? d.slice(0, 4) : null)
