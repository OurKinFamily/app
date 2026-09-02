/**
 * How the people list can be ordered.
 *
 * "Closest first" is the API's own order — the viewer, then kin, then people
 * sharing a surname, each tier by how often they appear in photographs. v1
 * showed this and offered nothing else, and it is the only ordering that
 * answers "who is this archive about" rather than "what letter does their
 * name start with".
 */
export const SORTS = [
  { key: 'suggested', label: 'Closest first' },
  { key: 'name', label: 'Name' },
  { key: 'born', label: 'Oldest first' },
]
