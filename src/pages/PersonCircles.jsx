import { useState, useEffect } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { mediaUrl } from '../lib/media'
import { displayName } from '../lib/people'
import { EntityItem } from '../components/EntityItem'
import {
  TYPE_LABELS,
  Section,
  AddGroupPanel,
  AddConnectionPanel,
  InlineSuggestion,
} from './PersonOverview'

// Groups + Connections — the social fabric around a person. Lives in its
// own tab so the Overview can focus on personal details.
export function PersonCircles() {
  const { person } = useOutletContext()
  const navigate = useNavigate()
  const [groups, setGroups]           = useState([])
  const [connections, setConnections] = useState([])
  const [addingGroup, setAddingGroup] = useState(false)
  const [addingConn, setAddingConn]   = useState(false)
  const [suggestions, setSuggestions] = useState([])

  function loadGroups() {
    fetch(`/api/people/${person.id}/groups`).then(r => r.json()).then(setGroups).catch(() => {})
  }
  function loadConnections() {
    fetch(`/api/people/${person.id}/connections`).then(r => r.json()).then(setConnections).catch(() => {})
  }
  function loadSuggestions() {
    fetch(`/api/suggestions/?person_id=${person.id}`)
      .then(r => r.ok ? r.json() : []).then(setSuggestions).catch(() => {})
  }

  useEffect(() => { loadGroups(); loadConnections(); loadSuggestions() }, [person.id])

  async function dismissSuggestion(id, accept) {
    await fetch(`/api/suggestions/${id}/${accept ? 'accept' : 'reject'}`, { method: 'POST' })
    loadSuggestions()
  }

  async function removeConnection(otherId) {
    await fetch(`/api/people/${person.id}/connections/${otherId}`, { method: 'DELETE' })
    loadConnections()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* ── Groups ── */}
      <Section label="Groups" count={groups.length} action="+ Add" onAction={() => setAddingGroup(v => !v)} actionActive={addingGroup}>
        {addingGroup && (
          <AddGroupPanel personId={person.id} onAdded={() => { setAddingGroup(false); loadGroups() }} />
        )}
        {suggestions.filter(s => s.type === 'group_membership' && s.person_id === person.id).map(s => (
          <InlineSuggestion key={s.id} suggestion={s} onYes={async () => {
            await fetch(`/api/groups/${s.target?.id}/members`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ person_id: person.id, role: null }),
            })
            await dismissSuggestion(s.id, true)
            loadGroups()
          }} onNo={() => dismissSuggestion(s.id, false)} />
        ))}
        {groups.map(g => (
          <Link key={g.id} to={`/manage/groups/${g.id}`}
            className="flex items-center gap-3 p-2.5 bg-white/3 hover:bg-white/6 border border-white/6 rounded-lg transition-colors group">
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-white/70 group-hover:text-white">{g.name}</span>
              {g.role && <span className="text-[11px] text-white/30 ml-2">{g.role}</span>}
              <div className="text-[11px] text-white/25 mt-0.5">
                {TYPE_LABELS[g.type] || g.type}{g.year ? ` · ${g.year}` : ''}{g.location_name ? ` · ${g.location_name}` : ''}
              </div>
            </div>
          </Link>
        ))}
        {groups.length === 0 && !addingGroup && <p className="text-[12px] text-white/25">No groups yet.</p>}
      </Section>

      {/* ── Connections ── */}
      <Section label="Connections" count={connections.length} action="+ Add" onAction={() => setAddingConn(v => !v)} actionActive={addingConn}>
        {addingConn && (
          <AddConnectionPanel
            personId={person.id}
            existingIds={new Set(connections.map(c => c.id))}
            onAdded={() => { setAddingConn(false); loadConnections() }}
          />
        )}
        {suggestions.filter(s => s.type === 'connection' && (s.person_id === person.id || s.target_id === person.id)).map(s => {
          const otherId   = s.person_id === person.id ? s.target_id : s.person_id
          const otherNode = s.person_id === person.id ? s.target    : s.person
          return (
            <InlineSuggestion key={s.id} suggestion={s} otherPerson={otherNode} onYes={async (context) => {
              await fetch(`/api/people/${person.id}/connections`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_id: otherId, context: context || null }),
              })
              await dismissSuggestion(s.id, true)
              loadConnections()
            }} onNo={() => dismissSuggestion(s.id, false)} />
          )
        })}
        {connections.map(c => (
          <div key={c.id} className="group relative">
            <EntityItem
              avatar={c.avatar ? mediaUrl(c.avatar) : null}
              initials
              text={displayName(c)}
              secondary={
                <span>
                  {c.context && <span>{c.context}</span>}
                  {c.through_groups?.map(g => (
                    <Link key={g.id} to={`/manage/groups/${g.id}`} className="ml-2 text-white/30 hover:text-white/60">via {g.name}</Link>
                  ))}
                </span>
              }
              trailing={c.since || undefined}
              onClick={() => navigate(`/manage/people/${c.id}`)}
            />
            <button
              onClick={e => { e.preventDefault(); removeConnection(c.id) }}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded px-2 text-[11px] text-white/30 hover:text-red-400 group-hover:block"
            >Remove</button>
          </div>
        ))}
        {connections.length === 0 && !addingConn && <p className="text-[12px] text-white/25">No connections yet.</p>}
      </Section>
    </div>
  )
}
