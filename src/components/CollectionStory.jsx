import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Pencil } from 'lucide-react'

// Long-form narrative shown at the top of a collection page — the counterpart
// of a Person's biography. Distinct from `description`, which is the one-line
// subtitle on the collection card and has to stay short.
//
// Long stories are collapsed by default: a five-paragraph summary sitting above
// 140 thumbnails pushes the actual contents off the screen.
const COLLAPSE_OVER = 600   // characters before we bother collapsing

export function CollectionStory({ story, canEdit, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(story || '')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const long = (story || '').length > COLLAPSE_OVER

  async function save() {
    setSaving(true)
    try {
      const ok = await onSave(draft)
      if (ok) setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="mb-6 max-w-3xl space-y-3">
        <p className="text-[12px] text-white/40">
          Markdown. Blank line between paragraphs.
        </p>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={16}
          aria-label="Collection story"
          className="w-full rounded-lg border border-white/10 bg-white/5 p-3 font-mono text-[13px] leading-relaxed text-white outline-none focus:border-white/25"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { setDraft(story || ''); setEditing(false) }}
            className="rounded-lg px-3 py-1.5 text-[13px] text-white/50 transition-colors hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!story) {
    if (!canEdit) return null
    return (
      <button
        type="button"
        onClick={() => { setDraft(''); setEditing(true) }}
        className="mb-6 flex items-center gap-1.5 text-[12px] text-white/35 transition-colors hover:text-white/70"
      >
        <Pencil size={12} />
        Write about this collection
      </button>
    )
  }

  return (
    <div className="group relative mb-6 max-w-3xl">
      <div
        className={`prose prose-invert max-w-none text-[14px] leading-relaxed text-white/70 prose-p:my-3 ${
          long && !expanded ? 'line-clamp-[8]' : ''
        }`}
      >
        <ReactMarkdown>{story}</ReactMarkdown>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        {long && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="text-[12px] text-white/45 transition-colors hover:text-white/80"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => { setDraft(story); setEditing(true) }}
            aria-label="Edit collection story"
            className="flex items-center gap-1.5 text-[12px] text-white/30 opacity-0 transition-all hover:text-white/70 focus:opacity-100 group-hover:opacity-100"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
      </div>
    </div>
  )
}
