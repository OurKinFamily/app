import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate, Link } from 'react-router-dom'
import { EntityItem } from '../components/new/EntityItem'
import { groupMeta } from '../lib/groups'

export function PersonGroups() {
  const { person } = useOutletContext()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/people/${person.id}/groups`)
      .then(r => r.json())
      .then(d => { setGroups(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [person.id])

  return (
    <div className="max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Groups</h2>
        <Link to="/manage/groups" className="text-[11px] text-white/30 hover:text-white/60">Manage groups →</Link>
      </div>

      {loading ? (
        <p className="text-[13px] text-white/30">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-[13px] text-white/25">Not in any groups yet.</p>
      ) : (
        <div className="space-y-2">
          {groups.map(g => {
            const meta = [groupMeta(g), g.year || null].filter(Boolean).join(' · ')
            return (
              <EntityItem
                key={g.id}
                text={g.name}
                badge={g.role || null}
                secondary={meta || null}
                onClick={() => navigate(`/manage/groups/${g.id}`)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
