import { useOutletContext } from 'react-router-dom'
import { CoAppearanceTimeline } from '../ui/CoAppearanceTimeline'
import { C } from '../ui/tokens'

/**
 * Who was around this person, and when — read out of the photographs
 * themselves rather than from anything anybody recorded.
 */
export function PersonTimeline() {
  const { person } = useOutletContext()
  const first = person.known_as || (person.name || '').split(' ')[0]

  return (
    <div>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px', maxWidth: '70ch' }}>
        Everybody who appears in photographs with {first}, from the first they
        share to the last. Colour shows how many. Bars share a line when their
        years do not overlap, so this stays readable at a hundred people.
      </p>
      <CoAppearanceTimeline endpoint={`/api/people/${person.id}/connection-timeline`} />
    </div>
  )
}
