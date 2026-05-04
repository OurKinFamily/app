import { useOutletContext } from 'react-router-dom'
import { Link } from 'react-router-dom'

export function PersonOverview() {
  const { person, relatives } = useOutletContext()

  return (
    <div className="max-w-xl space-y-8">
      {person.maiden_name && (
        <p className="text-white/40 text-sm">Née {person.maiden_name}</p>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        {person.birth_date && (
          <Field label="Born" value={formatDate(person.birth_date, person.birth_date_precision)} />
        )}
        {person.birth_place && (
          <Field label="Birthplace" value={person.birth_place} />
        )}
        {person.death_date && (
          <Field label="Died" value={formatDate(person.death_date, person.death_date_precision)} />
        )}
        {person.death_place && (
          <Field label="Place of death" value={person.death_place} />
        )}
      </div>

      {relatives && (
        <div className="space-y-5">
          <RelGroup label="Parents" people={relatives.parents} />
          <RelGroup label="Spouses" people={relatives.spouses} />
          <RelGroup label="Children" people={relatives.children} />
        </div>
      )}

      {person.notes && (
        <p className="text-white/50 text-sm">{person.notes}</p>
      )}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-white/40 uppercase tracking-wider text-xs mb-1">{label}</p>
      <p className="text-white/90">{value}</p>
    </div>
  )
}

function RelGroup({ label, people }) {
  if (!people?.length) return null
  return (
    <div>
      <p className="text-white/40 uppercase tracking-wider text-xs mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {people.map(p => (
          <Link
            key={p.id}
            to={`/manage/people/${p.id}`}
            className="rounded-lg bg-white/10 px-3 py-1 text-white/80 hover:bg-white/20 transition-colors"
          >
            {p.known_as || p.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

function formatDate(date, precision) {
  if (!date) return null
  if (precision === 'year') return date.slice(0, 4)
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
