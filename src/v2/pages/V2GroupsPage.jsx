import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { GroupIcon } from '../ui/GroupIcon'
import { LoadingDots } from '../ui/LoadingDots'
import { NewGroupDialog } from '../ui/NewGroupDialog'
import { TYPE_LABELS, typeLabel } from '../lib/circleTypes'
import { useIsAdmin } from '../../contexts/MeContext'
import { C } from '../ui/tokens'

/**
 * Every group in the archive: the teams, classes, workplaces and churches
 * people belonged to.
 *
 * Grouped by kind rather than listed flat. Twenty-five groups is few enough to
 * show at once and too many to scan as one column, and "which school was that"
 * is the question somebody actually arrives with.
 */
export function V2GroupsPage() {
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [groups, setGroups] = useState(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    fetch('/api/groups/')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setGroups(Array.isArray(d) ? d : []))
      .catch(() => setGroups([]))
  }, [])

  useEffect(() => { load() }, [load])

  if (groups === null) return <LoadingDots />

  const q = query.trim().toLowerCase()
  const shown = q
    ? groups.filter(g => [g.name, g.location_name, typeLabel(g.type)]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
    : groups

  // In the order the vocabulary lists them, so the page keeps a stable shape
  // as groups come and go.
  const kinds = Object.keys(TYPE_LABELS)
    .map(type => ({ type, groups: shown.filter(g => g.type === type) }))
    .filter(k => k.groups.length)
  const other = shown.filter(g => !TYPE_LABELS[g.type])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 18px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Groups</h1>
        <span style={{ fontSize: 13, color: C.muted }}>
          {shown.length === groups.length ? groups.length : `${shown.length} of ${groups.length}`}
        </span>
        <div style={{ flex: 1 }} />
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 34, padding: '0 14px', borderRadius: 17,
          background: C.surface, minWidth: 220,
        }}>
          <Search size={15} color={C.muted} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search groups"
            aria-label="Search groups"
            style={{
              border: 0, background: 'transparent', outline: 'none',
              font: 'inherit', fontSize: 13, color: C.text, width: '100%',
            }}
          />
        </label>
        {isAdmin && (
          <button type="button" onClick={() => setCreating(true)} style={pill}>
            <Plus size={15} /> New group
          </button>
        )}
      </div>

      {shown.length === 0 && (
        <p style={{ fontSize: 13.5, color: C.muted }}>
          {query ? `Nothing matches “${query}”.` : 'No groups yet.'}
        </p>
      )}

      {[...kinds, ...(other.length ? [{ type: null, groups: other }] : [])].map(kind => (
        <section key={kind.type || 'other'} style={{ marginBottom: 22 }}>
          <h2 style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 11.5, fontWeight: 500, color: C.muted, margin: '0 0 8px',
          }}>
            <GroupIcon type={kind.type} size={13} />
            {kind.type ? typeLabel(kind.type) : 'Other'}
          </h2>

          <div style={{
            display: 'grid', gap: 6,
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          }}>
            {kind.groups.map(g => (
              <GroupRow key={g.id} group={g} onOpen={() => navigate(`/v2/groups/${g.id}`)} />
            ))}
          </div>
        </section>
      ))}

      {creating && (
        <NewGroupDialog
          onClose={() => setCreating(false)}
          onCreated={id => { setCreating(false); load(); navigate(`/v2/groups/${id}`) }}
        />
      )}
    </div>
  )
}

function GroupRow({ group, onOpen }) {
  const [lit, setLit] = useState(false)
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        padding: '8px 10px', borderRadius: 10, font: 'inherit', cursor: 'pointer',
        border: `1px solid ${C.border}`,
        background: lit ? C.hover : C.bg,
        color: C.text,
      }}
    >
      <span style={{
        display: 'grid', placeItems: 'center', width: 30, height: 30,
        borderRadius: 8, background: C.surface, color: C.muted, flex: '0 0 auto',
      }}>
        <GroupIcon type={group.type} size={15} />
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{
          display: 'block', fontSize: 13.5,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {group.name}
        </span>
        <span style={{ display: 'block', fontSize: 11.5, color: C.muted }}>
          {[
            group.member_count
              ? `${group.member_count} ${group.member_count === 1 ? 'person' : 'people'}`
              : 'Nobody yet',
            group.location_name,
          ].filter(Boolean).join(' · ')}
        </span>
      </span>
    </button>
  )
}

const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  height: 34, padding: '0 14px', borderRadius: 17,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, fontSize: 13, cursor: 'pointer',
}
