import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PersonSearch } from './PersonSearch'
import { Avatar } from '../Avatar'
import { displayName } from '../../lib/people'
import { mediaUrl } from '../../lib/media'
import { C } from '../tokens'

/**
 * Who is this? — pinned to the bottom, because it is the only question.
 *
 * The five people who turn up most are chips: an evening of this is the same
 * handful of names several hundred times, and typing them is the work rather
 * than the deciding.
 *
 * "The next N as well" appears once you have named somebody and there are more
 * faces behind the ones on screen. It is how a group of four hundred gets done
 * in five clicks instead of two.
 */
export function AssignBar({ assign, quickPeople }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 5,
      padding: '10px 0 12px', background: C.bg,
      borderTop: `1px solid ${C.border}`,
    }}>
      {assign.lastNamed && assign.remaining > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: C.muted }}>
            {assign.faces.length.toLocaleString()} faces still in this group
          </span>
          <button
            type="button"
            disabled={assign.saving}
            onClick={() => assign.assign(assign.lastNamed.id, assign.lastNamed.name)}
            style={{ ...pill, opacity: assign.saving ? 0.5 : 1 }}
          >
            The next {Math.min(assign.batch, assign.faces.length).toLocaleString()} are {assign.lastNamed.name} too
          </button>
        </div>
      )}

      {adding ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { assign.createAndAssign(name); setAdding(false); setName('') }
              if (e.key === 'Escape') { setAdding(false); setName('') }
            }}
            placeholder="Their full name…"
            style={{
              flex: 1, minWidth: 200, height: 34, padding: '0 12px',
              border: `1px solid ${C.border}`, borderRadius: 17,
              font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
            }}
          />
          <button
            type="button"
            disabled={!name.trim() || assign.saving}
            onClick={() => { assign.createAndAssign(name); setAdding(false); setName('') }}
            style={{ ...primary, opacity: !name.trim() || assign.saving ? 0.5 : 1 }}
          >
            Add them
          </button>
          <button type="button" onClick={() => { setAdding(false); setName('') }} style={pill}>
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {quickPeople.map(p => (
              <button
                key={p.id}
                type="button"
                disabled={assign.saving}
                onClick={() => assign.assign(p.id, displayName(p))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '3px 12px 3px 3px', borderRadius: 999, font: 'inherit',
                  border: `1px solid ${C.border}`, background: C.bg,
                  fontSize: 12.5, cursor: 'pointer',
                }}
              >
                <Avatar name={displayName(p)} src={p.avatar ? mediaUrl(p.avatar) : null} size={22} />
                {p.known_as || p.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <PersonSearch
                placeholder="Somebody else…"
                disabled={assign.saving}
                onPick={p => assign.assign(p.id, displayName(p))}
              />
            </div>
            <button type="button" onClick={() => setAdding(true)} style={pill}>
              <Plus size={13} /> Somebody new
            </button>
            <button type="button" onClick={assign.skip} style={pill}>
              Not now
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 32, padding: '0 14px', borderRadius: 16, fontSize: 12.5,
  border: `1px solid ${C.border}`, background: C.bg,
  color: C.text, cursor: 'pointer', whiteSpace: 'nowrap',
}
const primary = {
  height: 32, padding: '0 16px', borderRadius: 16, fontSize: 12.5,
  border: 0, background: C.activeText, color: '#fff', cursor: 'pointer',
}
