import { useOutletContext } from 'react-router-dom'
import { ConnectionTimeline } from '../components/ConnectionTimeline'

// Co-appearance timeline tab. Renders the lane-packed gantt of every
// person who shares meaningful overlap with the subject.
export function PersonTimeline() {
  const { person } = useOutletContext()
  return <ConnectionTimeline endpoint={`/api/people/${person.id}/connection-timeline`} />
}
