import { useOutletContext } from 'react-router-dom'
import { PersonPhotos } from '../ui/PersonPhotos'
import { LifeStages } from '../ui/LifeStages'

/**
 * A person's overview: the years of their life as pictures, and everything
 * they appear in.
 *
 * It used to open with their relationship, their dates and their notes. The
 * relationship moved into the hero, where it shows on every tab; the dates and
 * notes moved to the top of the Biography tab, where the writing is. For most
 * people those fields are all empty, so Overview now begins with the thing
 * every person in the archive actually has — photographs.
 */
export function PersonOverview() {
  const { person } = useOutletContext()

  return (
    <div>
      <LifeStages personId={person.id} />
      <PersonPhotos personId={person.id} />
    </div>
  )
}
