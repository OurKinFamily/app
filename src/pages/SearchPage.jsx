import { useEffect, useRef, useState } from 'react'
import { Search as SearchIcon, Loader2, Plus } from 'lucide-react'
import { Container } from '../components/Container'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { MediaGallery } from '../components/MediaGallery'
import { MediaLightbox } from '../components/MediaLightbox'
import { MediaDetail } from '../components/MediaDetail'
import { search } from '../lib/api'

const SUGGESTIONS = [
  "Margaret's birthday",
  'Stephen and Patty in 1994',
  'first photo of Henry and Dorothy',
  'videos at the cottage',
  'how many photos of Henry',
  'how old is Margaret?',
]

const ANSWER_TONE = {
  success: 'border-green-500/30 bg-green-500/10 text-green-100',
  info:    'border-white/10    bg-white/[0.04] text-white/90',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  error:   'border-red-500/30   bg-red-500/10   text-red-100',
}

export function SearchPage() {
  const [query, setQuery]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [conversation, setConversation] = useState([])  // [{q, result}]
  const [viewer, setViewer]             = useState(null) // {items, index} | null
  const inputRef                        = useRef(null)
  const bottomRef                       = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [conversation, loading])

  async function run(q, { fresh = false } = {}) {
    const text = (q ?? query).trim()
    if (!text) return
    setQuery('')
    setLoading(true)
    setError(null)
    const history = fresh ? [] : conversation.map(t => ({ q: t.q, plan: t.result?.debug?.plan || {} }))
    try {
      const r = await search(text, history)
      const next = fresh ? [] : conversation
      setConversation([...next, { q: text, result: r }])
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      inputRef.current?.focus()
      setLoading(false)
    }
  }

  function newConversation() {
    setConversation([])
    setError(null)
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-[calc(100vh-var(--app-header-h,3rem))] flex-col">
      {/* Conversation scroll area */}
      <div className="flex-1 overflow-y-auto">
        <Container className="py-6">
          {conversation.length === 0 && !loading && (
            <Intro onPick={s => run(s, { fresh: true })} />
          )}

          <div className="flex flex-col gap-6">
            {conversation.map((turn, i) => (
              <Turn key={i} turn={turn} onOpenViewer={setViewer} />
            ))}
            {loading && <LoadingBubble />}
            {error && <ErrorBubble msg={error} />}
          </div>
          <div ref={bottomRef} />
        </Container>
      </div>

      {/* Sticky composer */}
      <div className="shrink-0 border-t border-white/5 bg-black/80 backdrop-blur">
        <Container className="py-3">
          <form onSubmit={e => { e.preventDefault(); run() }} className="flex gap-2">
            {conversation.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={newConversation}
                title="New conversation"
              >
                <Plus size={13} /> new
              </Button>
            )}
            <div className="relative flex-1">
              <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={conversation.length > 0 ? 'Refine — e.g. "a little older", "at the cottage"' : 'Ask anything about the archive…'}
                className="!pl-9"
              />
            </div>
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Ask'}
            </Button>
          </form>
        </Container>
      </div>

      {viewer && (
        <MediaLightbox
          items={viewer.items}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
          renderDetail={(it, ctx, v) => <MediaDetail key={`${it.path}-${v}`} item={it} ctx={ctx} />}
        />
      )}
    </div>
  )
}

function Intro({ onPick }) {
  return (
    <div className="mx-auto max-w-xl py-8 text-center">
      <h1 className="text-2xl font-semibold text-white">Search the archive</h1>
      <p className="mt-2 text-[13px] text-white/40">
        Ask for photos by person, date, place, or just a question.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-full border border-white/10 px-3 py-1 text-[12px] text-white/60 transition-colors hover:border-white/25 hover:bg-white/5 hover:text-white"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function Turn({ turn, onOpenViewer }) {
  const r = turn.result
  return (
    <div className="flex flex-col gap-3">
      <UserBubble q={turn.q} />
      <AssistantBubble result={r} onOpenViewer={onOpenViewer} />
    </div>
  )
}

function UserBubble({ q }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-blue-500/30 bg-blue-500/15 px-3.5 py-2 text-[13px] text-blue-50">
        {q}
      </div>
    </div>
  )
}

function AssistantBubble({ result, onOpenViewer }) {
  const tone = ANSWER_TONE[result?.answer?.tone] || ANSWER_TONE.info
  const media = result?.media || []
  return (
    <div className="flex flex-col gap-2">
      <div className={`max-w-[85%] rounded-2xl rounded-tl-sm border px-3.5 py-2.5 text-[13px] leading-relaxed ${tone}`}>
        <div>{result?.answer?.message || '…'}</div>
        {result?.answer?.details?.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[11px] opacity-70">
            {result.answer.details.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        )}
      </div>
      {media.length > 0 && (
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
          <MediaGallery
            items={media}
            onSelect={item => {
              const i = media.findIndex(m => m.path === item.path)
              onOpenViewer({ items: media, index: Math.max(0, i) })
            }}
          />
        </div>
      )}
    </div>
  )
}

function LoadingBubble() {
  return (
    <div className="flex">
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[12px] text-white/50">
        <Loader2 size={14} className="animate-spin" />
        thinking…
      </div>
    </div>
  )
}

function ErrorBubble({ msg }) {
  return (
    <div className="flex">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-200">
        {msg}
      </div>
    </div>
  )
}
