import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { AncestryGapCard, SuggestionCard } from '../ui/SuggestionCard'
import { LoadingDots } from '../ui/LoadingDots'
import { KINDS, useSuggestions } from '../lib/useSuggestions'
import { C } from '../ui/tokens'

/**
 * Everything the archive has noticed and would like an answer about.
 *
 * Two people in forty photographs together, somebody whose photographs all
 * start in 1962, a group with no place on it. None of it is acted on without a
 * yes — a guess applied quietly becomes a fact nobody remembers agreeing to,
 * and this archive is meant to be trustworthy about what it claims.
 */
const PAGE = 50

export function V2SuggestionsPage() {
  const { suggestions, loading, generating, regenerate, remove } = useSuggestions()
  const [kind, setKind] = useState('all')
  const [shown, setShown] = useState(PAGE)

  const shownKind = kind === 'all' ? suggestions : suggestions.filter(s => s.type === kind)
  const visible = shownKind.slice(0, shown)
  const kinds = [...new Set(suggestions.map(s => s.type))]

  const pick = next => { setKind(next); setShown(PAGE) }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 0 6px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Worth asking about</h1>
        {!loading && (
          <span style={{ fontSize: 12.5, color: C.muted }}>
            {suggestions.length.toLocaleString()} waiting
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={regenerate} disabled={generating} style={pill}>
          <RefreshCw size={14} /> {generating ? 'Looking…' : 'Look again'}
        </button>
      </div>

      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 16px', maxWidth: '76ch' }}>
        Guesses drawn from who turns up with whom, and when. Nothing here is written down
        until you say so.
      </p>

      {kinds.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          <Chip on={kind === 'all'} onClick={() => pick('all')}>
            Everything {suggestions.length.toLocaleString()}
          </Chip>
          {kinds.map(k => (
            <Chip key={k} on={kind === k} onClick={() => pick(k)}>
              {KINDS[k] || k} {suggestions.filter(s => s.type === k).length.toLocaleString()}
            </Chip>
          ))}
        </div>
      )}

      {loading && <LoadingDots />}

      {!loading && shownKind.length === 0 && (
        <p style={{ fontSize: 13, color: C.muted }}>
          Nothing to ask about. “Look again” goes back over the archive for more.
        </p>
      )}

      {visible.map(s => (s.type === 'missing_ancestry'
        ? <AncestryGapCard key={s.id} suggestion={s} onDone={remove} />
        : <SuggestionCard key={s.id} suggestion={s} onDone={remove} />
      ))}

      {shown < shownKind.length && (
        <button type="button" onClick={() => setShown(n => n + PAGE)} style={more}>
          Show more — {(shownKind.length - shown).toLocaleString()} left
        </button>
      )}
    </div>
  )
}

function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 28, padding: '0 12px', borderRadius: 14, fontSize: 12, font: 'inherit',
        border: `1px solid ${on ? C.activeText : C.border}`,
        background: on ? C.activeBg : C.bg,
        color: on ? C.activeText : C.text,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 32, padding: '0 14px', borderRadius: 16, fontSize: 12.5,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}
const more = {
  width: '100%', height: 32, borderRadius: 16, fontSize: 12.5, marginTop: 8,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}
