import { PersonRidgeline } from '../ui/PersonRidgeline'
import { C } from '../ui/tokens'

/**
 * Family — who this archive is actually about.
 *
 * A ridge per person showing how often they appear year by year, which turns
 * out to be a picture of a family: children arriving as new ridges, somebody
 * going quiet when they left home, the years everybody was in one place.
 */
export function V2FamilyPage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 400, margin: '4px 0 4px' }}>Family</h1>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 16px', maxWidth: '68ch' }}>
        How often each person appears, year by year. Taller means more
        photographs that year; each ridge is scaled to its own busiest year, so
        the shape of one person&rsquo;s life stays readable next to somebody
        with far more pictures.
      </p>
      <PersonRidgeline endpoint="/api/people/year-density" />
    </div>
  )
}
