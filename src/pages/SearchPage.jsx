import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search as SearchIcon } from 'lucide-react'
import { MediaGrid } from '../ui/MediaGrid'
import { MediaDetail } from '../ui/MediaDetail'
import { LoadingDots } from '../ui/LoadingDots'
import { search } from '../lib/api'
import { C } from '../ui/tokens'

/**
 * Asking the archive for something in your own words.
 *
 * A conversation rather than a search box, because the useful questions here
 * are rarely answerable in one go: "Stephen and Patty" then "a bit older" then
 * "at the cottage" is how somebody actually narrows in. Each turn carries the
 * plan of the last, so the follow-up refines rather than starting over.
 */
const EXAMPLES = [
  'Margaret’s birthday',
  'Stephen and Patty in 1994',
  'the first photograph of Henry and Dorothy',
  'films at the cottage',
  'how many photographs of Henry are there',
  'how old is Margaret',
]

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [turns, setTurns] = useState([])
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState(null)
  const [photo, setPhoto] = useState(null)
  const box = useRef(null)
  const foot = useRef(null)

  const ask = useCallback(async (text, { fresh = false } = {}) => {
    const asked = text.trim()
    if (!asked) return
    setQuery('')
    setThinking(true)
    setError(null)
    try {
      const history = fresh
        ? []
        : turns.map(t => ({ q: t.q, plan: t.result?.debug?.plan || {} }))
      const result = await search(asked, history)
      setTurns(prev => (fresh ? [] : prev).concat({ q: asked, result }))
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setThinking(false)
      box.current?.focus()
    }
  }, [turns])

  // A question typed into the header arrives here as ?q=. It used to be
  // dropped on the floor: the page opened, the box was empty, and the question
  // had to be typed a second time.
  const asked = params.get('q')
  useEffect(() => {
    if (!asked) return
    // Deferred: clearing the parameter is a state change, and doing it in the
    // effect body starts a second render before the first has painted.
    queueMicrotask(() => {
      setParams({}, { replace: true })
      ask(asked, { fresh: true })
    })
    // Only when a question arrives in the URL. Listing `ask` would re-run it
    // after every turn, since `ask` changes with the conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked])

  useEffect(() => {
    foot.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, thinking])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 116px)' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {turns.length === 0 && !thinking && (
          <div style={{ maxWidth: 560, margin: '28px auto', textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 400, margin: '0 0 6px' }}>
              Ask the archive
            </h1>
            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 18px' }}>
              People, places, years, or a plain question. Then keep talking to narrow it down.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {EXAMPLES.map(example => (
                <button
                  key={example}
                  type="button"
                  onClick={() => ask(example, { fresh: true })}
                  style={{
                    height: 30, padding: '0 13px', borderRadius: 15, fontSize: 12.5,
                    font: 'inherit', border: `1px solid ${C.border}`,
                    background: C.bg, color: C.text, cursor: 'pointer',
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <Turn key={i} turn={turn} onOpen={setPhoto} />
        ))}

        {thinking && <LoadingDots />}
        {error && (
          <p style={{
            display: 'inline-block', padding: '9px 14px', borderRadius: 14,
            fontSize: 13, background: '#fce8e6', color: '#c5221f',
          }}>
            {error}
          </p>
        )}
        <div ref={foot} />
      </div>

      <form
        onSubmit={e => { e.preventDefault(); ask(query) }}
        style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '12px 0 4px', borderTop: `1px solid ${C.border}`,
        }}
      >
        {turns.length > 0 && (
          <button
            type="button"
            onClick={() => { setTurns([]); setError(null); setQuery(''); box.current?.focus() }}
            title="Start again"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 14px', borderRadius: 18, fontSize: 12.5,
              border: `1px solid ${C.border}`, background: C.bg,
              color: C.text, cursor: 'pointer', flex: '0 0 auto',
            }}
          >
            <Plus size={14} /> Start again
          </button>
        )}

        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <SearchIcon
            size={15}
            style={{
              position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
              color: C.muted, pointerEvents: 'none',
            }}
          />
          <input
            ref={box}
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={turns.length
              ? 'Narrow it down — “a bit older”, “at the cottage”'
              : 'Ask anything about the archive…'}
            style={{
              width: '100%', boxSizing: 'border-box', height: 40, padding: '0 14px 0 36px',
              border: `1px solid ${C.border}`, borderRadius: 20,
              font: 'inherit', fontSize: 13.5, color: C.text, background: C.surface,
            }}
          />
        </div>

        <button
          type="submit"
          disabled={thinking || !query.trim()}
          style={{
            height: 36, padding: '0 18px', borderRadius: 18, fontSize: 13,
            border: 0, background: C.activeText, color: '#fff',
            cursor: 'pointer', flex: '0 0 auto',
            opacity: thinking || !query.trim() ? 0.45 : 1,
          }}
        >
          Ask
        </button>
      </form>

      {photo && <MediaDetail item={photo} onClose={() => setPhoto(null)} />}
    </div>
  )
}

function Turn({ turn, onOpen }) {
  const media = turn.result?.media || []
  const answer = turn.result?.answer

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <span style={{
          maxWidth: '80%', padding: '8px 14px', borderRadius: 18,
          background: C.activeBg, color: C.activeText, fontSize: 13.5,
        }}>
          {turn.q}
        </span>
      </div>

      <div style={{
        maxWidth: '85%', padding: '9px 14px', marginBottom: 10, borderRadius: 18,
        background: tone(answer?.tone), fontSize: 13.5, lineHeight: 1.55,
        color: answer?.tone === 'error' ? '#c5221f' : C.text,
      }}>
        {answer?.message || '…'}
        {answer?.details?.length > 0 && (
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: C.muted }}>
            {answer.details.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        )}
      </div>

      {media.length > 0 && (
        <MediaGrid items={media} showUndatedSection={false} onOpen={onOpen} />
      )}
    </div>
  )
}

const tone = kind => ({
  success: '#e6f4ea',
  warning: '#fef7e0',
  error: '#fce8e6',
}[kind] || C.surface)
