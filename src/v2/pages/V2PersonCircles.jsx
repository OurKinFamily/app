import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { AddToGroup } from '../ui/AddToGroup'
import { AddConnection } from '../ui/AddConnection'
import { describeGroup } from '../lib/circleTypes'
import { displayName } from '../../lib/people'
import { mediaUrl } from '../../lib/media'
import { useIsAdmin } from '../../contexts/MeContext'
import { C } from '../ui/tokens'

/**
 * The people and places around somebody, as distinct from the family they were
 * born into: the team, the class, the workplace, the friends.
 *
 * Two columns because they answer different questions — "where did they spend
 * their time" and "who did they know" — and because a connection is very often
 * explained by a group they shared.
 */
export function V2PersonCircles() {
  const { person } = useOutletContext()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [groups, setGroups] = useState([])
  const [connections, setConnections] = useState([])
  const [adding, setAdding] = useState(null)   // 'group' | 'connection' | null

  const load = useCallback(() => {
    fetch(`/api/people/${person.id}/groups`)
      .then(r => (r.ok ? r.json() : []))
      .then(rows => setGroups(Array.isArray(rows) ? rows : []))
      .catch(() => {})
    fetch(`/api/people/${person.id}/connections`)
      .then(r => (r.ok ? r.json() : []))
      .then(rows => setConnections(Array.isArray(rows) ? rows : []))
      .catch(() => {})
  }, [person.id])

  useEffect(() => { load() }, [load])

  async function disconnect(otherId) {
    await fetch(`/api/people/${person.id}/connections/${otherId}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{
      display: 'grid', gap: 28,
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    }}>
      <section>
        <Heading
          label="Groups"
          count={groups.length}
          canAdd={isAdmin}
          open={adding === 'group'}
          onToggle={() => setAdding(a => (a === 'group' ? null : 'group'))}
        />

        {adding === 'group' && (
          <AddToGroup
            personId={person.id}
            onCancel={() => setAdding(null)}
            onAdded={() => { setAdding(null); load() }}
          />
        )}

        {groups.map(g => (
          <Link key={g.id} to={`/v2/groups/${g.id}`} style={card}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, color: C.text }}>
                {g.name}
                {g.role && (
                  <span style={{ color: C.muted, fontSize: 11.5 }}> · {g.role}</span>
                )}
              </span>
              <span style={{ display: 'block', fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                {describeGroup(g)}
              </span>
            </span>
          </Link>
        ))}

        {groups.length === 0 && adding !== 'group' && (
          <Empty>Not in any groups yet.</Empty>
        )}
      </section>

      <section>
        <Heading
          label="Connections"
          count={connections.length}
          canAdd={isAdmin}
          open={adding === 'connection'}
          onToggle={() => setAdding(a => (a === 'connection' ? null : 'connection'))}
        />

        {adding === 'connection' && (
          <AddConnection
            personId={person.id}
            existingIds={new Set(connections.map(c => c.id))}
            onCancel={() => setAdding(null)}
            onAdded={() => { setAdding(null); load() }}
          />
        )}

        {connections.map(c => (
          <ConnectionRow
            key={c.id}
            person={c}
            canEdit={isAdmin}
            onOpen={() => navigate(`/v2/people/${c.id}`)}
            onRemove={() => disconnect(c.id)}
          />
        ))}

        {connections.length === 0 && adding !== 'connection' && (
          <Empty>No connections recorded yet.</Empty>
        )}
      </section>
    </div>
  )
}

function ConnectionRow({ person: c, canEdit, onOpen, onRemove }) {
  const [lit, setLit] = useState(false)
  return (
    <div
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        borderRadius: 8, padding: '5px 6px',
        background: lit ? C.hover : 'transparent',
      }}
    >
      <button type="button" onClick={onOpen} style={{ ...bare, flex: 1, minWidth: 0 }}>
        <Avatar name={displayName(c)} src={c.avatar ? mediaUrl(c.avatar) : null} size={30} />
        <span style={{ minWidth: 0, textAlign: 'left' }}>
          <span style={{ display: 'block', fontSize: 13.5, color: C.text }}>
            {displayName(c)}
          </span>
          {(c.context || c.through_groups?.length || c.since) && (
            <span style={{ display: 'block', fontSize: 11.5, color: C.muted }}>
              {[
                c.context,
                c.through_groups?.map(g => `via ${g.name}`).join(', '),
                c.since,
              ].filter(Boolean).join(' · ')}
            </span>
          )}
        </span>
      </button>

      {canEdit && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove the connection to ${displayName(c)}`}
          title="Remove this connection"
          style={{
            display: 'grid', placeItems: 'center', width: 24, height: 24,
            border: 0, borderRadius: '50%', background: 'transparent',
            color: C.muted, cursor: 'pointer',
            opacity: lit ? 1 : 0, transition: 'opacity 90ms ease',
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function Heading({ label, count, canAdd, open, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{label}</h2>
      {count > 0 && <span style={{ fontSize: 12.5, color: C.muted }}>{count}</span>}
      <div style={{ flex: 1 }} />
      {canAdd && (
        <button
          type="button"
          onClick={onToggle}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            border: 0, background: 'transparent', cursor: 'pointer',
            color: open ? C.muted : C.activeText, fontSize: 12.5,
          }}
        >
          {open ? 'Cancel' : <><Plus size={14} /> Add</>}
        </button>
      )}
    </div>
  )
}

const Empty = ({ children }) => (
  <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>{children}</p>
)

const card = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 10px', marginBottom: 6,
  border: `1px solid ${C.border}`, borderRadius: 10,
  textDecoration: 'none', color: 'inherit',
}
const bare = {
  display: 'flex', alignItems: 'center', gap: 10,
  border: 0, background: 'transparent', cursor: 'pointer',
  font: 'inherit', color: 'inherit', padding: 0,
}
