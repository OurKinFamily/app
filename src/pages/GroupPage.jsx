import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, LayoutGrid, List, Search, X } from 'lucide-react'
import { GroupIcon } from '../ui/GroupIcon'
import { GroupEditor } from '../ui/GroupEditor'
import { AddMembers } from '../ui/AddMembers'
import { Avatar } from '../ui/Avatar'
import { ConfirmPopover } from '../ui/ConfirmPopover'
import { LoadingDots } from '../ui/LoadingDots'
import { useGroup } from '../lib/useGroup'
import { typeLabel } from '../lib/circleTypes'
import { displayName } from '../lib/people'
import { mediaUrl } from '../lib/media'
import { C } from '../ui/tokens'

/**
 * One circle of somebody's life, and everybody who was in it.
 *
 * A team, a class, a workplace, a congregation. The members are the whole
 * point — this is the page that answers "who else was in that photograph" for
 * a group nobody living can name any more.
 */
const VIEW_KEY = 'v2-group-members-view'

export function GroupPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const group = useGroup(id)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [filter, setFilter] = useState('')
  const [view, setView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) || 'list' } catch { return 'list' }
  })

  const setViewMode = mode => {
    setView(mode)
    // A private window throws on write rather than quietly doing nothing, and
    // losing the page over a remembered preference would be absurd.
    try { localStorage.setItem(VIEW_KEY, mode) } catch { /* not important */ }
  }

  if (group.loading) return <LoadingDots />
  if (group.missing || !group.group) {
    return <p style={{ fontSize: 13, color: C.muted }}>That circle is not here.</p>
  }

  const g = group.group
  const members = g.members || []
  const query = filter.trim().toLowerCase()
  const shown = query
    ? members.filter(m => [m.name, m.known_as, m.role].filter(Boolean).join(' ').toLowerCase().includes(query))
    : members

  const when = [g.year, g.season].filter(Boolean).join(' ')

  return (
    <div>
      <Link
        to="/groups"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 12.5, color: C.muted, textDecoration: 'none',
        }}
      >
        <ChevronLeft size={14} /> All circles
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0 6px', flexWrap: 'wrap' }}>
        <span style={{ color: C.muted, flex: '0 0 auto' }}>
          <GroupIcon type={g.type} size={22} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>{g.name}</h1>
          <p style={{ fontSize: 12.5, color: C.muted, margin: '2px 0 0' }}>
            {[typeLabel(g.type), when, g.location_name].filter(Boolean).join(' · ')}
          </p>
        </div>

        <button type="button" onClick={() => setEditing(true)} style={ghost}>Edit</button>

        <span style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            style={{ ...ghost, color: '#c5221f', borderColor: '#f3c1bd' }}
          >
            Delete
          </button>
          {confirming && (
            <ConfirmPopover
              message={`Delete ${g.name}?`}
              detail="The people stay; only the circle and who was in it go."
              align="right"
              onCancel={() => setConfirming(false)}
              onConfirm={async () => { await group.remove(); navigate('/groups') }}
            />
          )}
        </span>
      </div>

      {g.notes && (
        <p style={{ fontSize: 13, color: C.text, margin: '0 0 18px', maxWidth: '72ch', lineHeight: 1.55 }}>
          {g.notes}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 10px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
          Who was in it
          <span style={{ marginLeft: 7, fontSize: 12, color: C.muted, fontWeight: 400 }}>
            {members.length.toLocaleString()}
          </span>
        </h2>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => setAdding(v => !v)} style={ghost}>
          {adding ? 'Cancel' : 'Add somebody'}
        </button>
        <ViewToggle value={view} onChange={setViewMode} />
      </div>

      {adding && (
        <AddMembers
          groupType={g.type}
          alreadyIn={new Set(members.map(m => m.id))}
          onAdd={async (people, role) => { await group.addMembers(people, role); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      )}

      {members.length > 2 && (
        <div style={{ position: 'relative', marginBottom: 10, maxWidth: 320 }}>
          <Search
            size={14}
            style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: C.muted, pointerEvents: 'none',
            }}
          />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Find somebody in here…"
            style={{
              width: '100%', boxSizing: 'border-box', height: 32, padding: '0 10px 0 32px',
              border: `1px solid ${C.border}`, borderRadius: 16,
              font: 'inherit', fontSize: 12.5, color: C.text, background: C.bg,
            }}
          />
        </div>
      )}

      {members.length === 0 && <p style={muted}>Nobody in it yet.</p>}
      {members.length > 0 && shown.length === 0 && (
        <p style={muted}>Nobody here matches “{filter}”.</p>
      )}

      <div style={view === 'grid'
        ? { display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }
        : { display: 'grid', gap: 2 }}
      >
        {shown.map(member => (
          <Member
            key={member.id}
            member={member}
            onOpen={() => navigate(`/people/${member.id}`)}
            onRemove={() => group.removeMember(member.id)}
          />
        ))}
      </div>

      {editing && (
        <GroupEditor group={g} onSave={group.save} onClose={() => setEditing(false)} />
      )}
    </div>
  )
}

function Member({ member, onOpen, onRemove }) {
  const [lit, setLit] = useState(false)

  return (
    <div
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 10px', borderRadius: 10,
        background: lit ? C.hover : 'transparent',
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0,
          border: 0, background: 'transparent', font: 'inherit', padding: 0,
          textAlign: 'left', cursor: 'pointer',
        }}
      >
        <Avatar
          name={displayName(member)}
          src={member.avatar ? mediaUrl(member.avatar) : null}
          size={30}
        />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', fontSize: 13,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {member.name}
          </span>
          {member.role && (
            <span style={{ display: 'block', fontSize: 11.5, color: C.muted }}>{member.role}</span>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Take ${member.name} out of this circle`}
        title="Take them out"
        style={{
          display: 'grid', placeItems: 'center', width: 26, height: 26, flex: '0 0 auto',
          border: 0, borderRadius: '50%', background: 'transparent',
          color: C.muted, cursor: 'pointer',
          // Only on hover: this is one click away from undoing somebody's
          // afternoon of naming a class photograph.
          opacity: lit ? 1 : 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

function ViewToggle({ value, onChange }) {
  return (
    <div style={{
      display: 'flex', flex: '0 0 auto', overflow: 'hidden',
      border: `1px solid ${C.border}`, borderRadius: 9,
    }}>
      {[['list', List, 'As a list'], ['grid', LayoutGrid, 'As a grid']].map(([mode, Icon, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-label={label}
          aria-pressed={value === mode}
          style={{
            display: 'grid', placeItems: 'center', width: 32, height: 30,
            border: 0, cursor: 'pointer',
            background: value === mode ? C.activeBg : 'transparent',
            color: value === mode ? C.activeText : C.muted,
          }}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  )
}

const ghost = {
  height: 32, padding: '0 14px', borderRadius: 16, fontSize: 12.5, font: 'inherit',
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer', flex: '0 0 auto',
}
const muted = { fontSize: 13, color: C.muted, margin: 0 }
