import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Link } from 'react-router-dom'

const TYPE_LABELS = {
  sports_team: 'Sports Team', fitness: 'Fitness', hobby_club: 'Hobby / Club',
  school_class: 'School Class', school: 'School', extracurricular: 'Extracurricular',
  workplace: 'Workplace', professional_org: 'Professional Org',
  neighborhood: 'Neighborhood', religious: 'Religious', civic: 'Civic',
  family_friend: 'Family Friend', extended_network: 'Extended Network',
  camp: 'Camp',
}

export function PersonGroups() {
  const { person } = useOutletContext()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/people/${person.id}/groups`)
      .then(r => r.json())
      .then(d => { setGroups(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [person.id])

  if (loading) return <p className="text-white/30 text-sm">Loading…</p>

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">Groups</h2>
        <Link to="/manage/groups" className="text-[11px] text-white/30 hover:text-white/60">Manage groups →</Link>
      </div>

      {groups.length === 0 ? (
        <p className="text-[13px] text-white/25">Not in any groups yet.</p>
      ) : (
        <div className="space-y-2">
          {groups.map(g => (
            <Link key={g.id} to={`/manage/groups/${g.id}`}
              className="flex items-center gap-3 p-3 bg-white/3 hover:bg-white/6 border border-white/6 rounded-lg transition-colors group">
              <div className="flex-1 min-w-0">
                <span className="text-[13px] text-white/70 group-hover:text-white">{g.name}</span>
                {g.role && <span className="text-[11px] text-white/30 ml-2">{g.role}</span>}
                <div className="text-[11px] text-white/25 mt-0.5">
                  {TYPE_LABELS[g.type] || g.type}
                  {g.year ? ` · ${g.year}` : ''}
                  {g.location_name ? ` · ${g.location_name}` : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
