import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from './Avatar'
import { acceptSuggestion, askAbout, rejectSuggestion, CONNECTION_KINDS, KINDS } from '../lib/useSuggestions'
import { displayName } from '../../lib/people'
import { mediaUrl } from '../../lib/media'
import { C } from './tokens'

/**
 * One guess, and the two answers it can have.
 *
 * Three of them need a detail before yes means anything — which relationship,
 * how they knew each other, what the name was — so the first yes opens the
 * question rather than acting. Better than a form nobody needs on the other
 * eleven kinds.
 *
 * Confidence is shown but kept small. It is the archive's opinion of its own
 * guess, and the photographs above it are better evidence than the number.
 */
export function SuggestionCard({ suggestion: s, onDone }) {
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState({ relType: '', context: '', maidenName: '' })

  const needsDetail = ['relationship', 'connection', 'maiden_name'].includes(s.type)
  const detailReady = {
    relationship: !!answer.relType,
    connection: true,           // "how" is welcome but not required
    maiden_name: !!answer.maidenName.trim(),
  }[s.type]

  async function yes() {
    if (needsDetail && !asking) { setAsking(true); return }
    setBusy(true)
    try {
      await acceptSuggestion(s, answer)
      onDone(s.id)
    } catch {
      setBusy(false)
    }
  }

  async function no() {
    setBusy(true)
    await rejectSuggestion(s)
    onDone(s.id)
  }

  const person = s.person ? displayName(s.person) : 'they'
  const other = s.target?.name || 'them'

  return (
    <div style={{
      padding: 14, borderRadius: 12, marginBottom: 8,
      border: `1px solid ${C.border}`, background: C.bg,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
            {s.person && (
              <Avatar
                name={displayName(s.person)}
                src={s.person.avatar ? mediaUrl(s.person.avatar) : null}
                size={24}
              />
            )}
            {s.target_kind === 'person' && s.target && (
              <Avatar
                name={s.target.name}
                src={s.target.avatar ? mediaUrl(s.target.avatar) : null}
                size={24}
              />
            )}
            <span style={{ fontSize: 13.5 }}>{askAbout(s)}</span>
            <span style={{
              padding: '1px 8px', borderRadius: 999, fontSize: 11,
              background: C.surface, color: C.muted,
            }}>
              {KINDS[s.type] || s.type}
            </span>
          </div>

          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 8px' }}>{s.reason}</p>

          {asking && s.type === 'relationship' && (
            <select
              value={answer.relType}
              onChange={e => setAnswer(a => ({ ...a, relType: e.target.value }))}
              style={field}
            >
              <option value="">How were they related?</option>
              <option value="parent">{person} was {other}&apos;s parent</option>
              <option value="child">{person} was {other}&apos;s child</option>
              <option value="spouse">{person} and {other} were married</option>
              <option value="sibling">{person} and {other} were siblings</option>
            </select>
          )}

          {asking && s.type === 'connection' && (
            <select
              value={answer.context}
              onChange={e => setAnswer(a => ({ ...a, context: e.target.value }))}
              style={field}
            >
              <option value="">How did they know each other?</option>
              {CONNECTION_KINDS.map(kind => <option key={kind} value={kind}>{kind}</option>)}
            </select>
          )}

          {asking && s.type === 'maiden_name' && (
            <input
              autoFocus
              value={answer.maidenName}
              onChange={e => setAnswer(a => ({ ...a, maidenName: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && detailReady && yes()}
              placeholder="Their name before marrying…"
              style={field}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
            <span style={{ width: 44, height: 3, borderRadius: 2, background: C.hover, overflow: 'hidden' }}>
              <span style={{
                display: 'block', height: '100%', borderRadius: 2,
                width: `${(s.confidence || 0) * 100}%`, background: C.muted,
              }} />
            </span>
            <span style={{ fontSize: 10.5, color: C.muted }}>
              {Math.round((s.confidence || 0) * 100)}% sure
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
          <button
            type="button"
            onClick={yes}
            disabled={busy || (asking && !detailReady)}
            style={{ ...pill, ...(busy || (asking && !detailReady) ? dim : yesTone) }}
          >
            {asking ? 'Save it' : 'Yes'}
          </button>
          <button type="button" onClick={no} disabled={busy} style={{ ...pill, ...(busy ? dim : {}) }}>
            No
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * The one suggestion that is not a question: somebody with nobody recorded
 * before them. It cannot be answered here — it is a piece of work — so it
 * offers the way there instead of a yes.
 */
export function AncestryGapCard({ suggestion: s, onDone }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
      padding: '10px 14px', borderRadius: 12,
      border: `1px solid ${C.border}`, background: C.bg,
    }}>
      {s.person && (
        <Avatar
          name={displayName(s.person)}
          src={s.person.avatar ? mediaUrl(s.person.avatar) : null}
          size={24}
        />
      )}
      <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
        {s.person?.name || 'Somebody'} — nobody recorded before them
      </span>
      <Link
        to={`/v2/people/${s.person_id}/ancestry`}
        onClick={async () => {
          await fetch(`/api/suggestions/${s.id}/accept`, { method: 'POST' })
          onDone(s.id)
        }}
        style={{ fontSize: 12.5, color: C.activeText, textDecoration: 'none' }}
      >
        Add their family →
      </Link>
      <button
        type="button"
        onClick={async () => { await rejectSuggestion(s); onDone(s.id) }}
        style={{ ...pill, fontSize: 12 }}
      >
        Not now
      </button>
    </div>
  )
}

const field = {
  width: '100%', boxSizing: 'border-box', height: 32, padding: '0 10px',
  marginBottom: 4, border: `1px solid ${C.border}`, borderRadius: 8,
  font: 'inherit', fontSize: 12.5, color: C.text, background: C.bg,
}
const pill = {
  height: 30, padding: '0 14px', borderRadius: 15, fontSize: 12.5, font: 'inherit',
  border: `1px solid ${C.border}`, background: C.bg, color: C.text, cursor: 'pointer',
}
const yesTone = { border: '1px solid #137333', color: '#137333' }
const dim = { opacity: 0.45, cursor: 'default' }
