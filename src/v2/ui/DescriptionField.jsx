import { useEffect, useRef, useState } from 'react'
import { C } from './tokens'

/**
 * What somebody wants to say about a photograph.
 *
 * Free-form, and it grows with what is written: a description might be four
 * words or four sentences, and a one-line box that scrolls internally
 * discourages the four sentences — which are the ones worth having.
 *
 * Saves when you click away, not on every keystroke. Half a sentence is not
 * worth a round trip, and an archive that saves mid-thought reads oddly when
 * somebody is still deciding what they remember.
 */
export function DescriptionField({ value, onSave, canEdit = true }) {
  // Stamped with the value it belongs to, so opening another photograph
  // invalidates the draft during render rather than through an effect that
  // sets state and triggers a second pass.
  const [draft, setDraft] = useState({ from: value || '', text: value || '' })
  const [state, setState] = useState('idle')   // idle | saving | saved
  const box = useRef(null)
  if (draft.from !== (value || '')) setDraft({ from: value || '', text: value || '' })

  const text = draft.text
  const setText = next => setDraft(d => ({ ...d, text: next }))

  // Grow to fit. Reset first, or the box can only ever get taller.
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  async function commit() {
    if (text === draft.from) return
    setState('saving')
    try {
      await onSave(text)
      setDraft({ from: text, text })
      setState('saved')
      setTimeout(() => setState(s => (s === 'saved' ? 'idle' : s)), 1600)
    } catch {
      setState('idle')
    }
  }

  if (!canEdit) {
    return value
      ? <p style={{ ...shared, margin: 0, whiteSpace: 'pre-wrap' }}>{value}</p>
      : null
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={box}
        value={text}
        rows={1}
        placeholder="Add a description"
        onChange={e => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          // Enter is a new paragraph here, not a submit — this is prose. Esc
          // abandons the edit, which is the only way back from a mistyped one.
          if (e.key === 'Escape') { setText(draft.from); e.target.blur() }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.target.blur()
        }}
        style={{
          ...shared,
          width: '100%', boxSizing: 'border-box', display: 'block',
          border: 0, borderBottom: `1px solid ${C.border}`,
          padding: '7px 0', background: 'transparent', outline: 'none',
          resize: 'none', overflow: 'hidden', font: 'inherit',
        }}
      />
      {state !== 'idle' && (
        <span style={{
          position: 'absolute', right: 0, bottom: 9,
          fontSize: 10.5, color: C.muted, pointerEvents: 'none',
        }}>
          {state === 'saving' ? 'Saving…' : 'Saved'}
        </span>
      )}
    </div>
  )
}

const shared = { fontSize: 13, lineHeight: 1.5, color: C.text }
