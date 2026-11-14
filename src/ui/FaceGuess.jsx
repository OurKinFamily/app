import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Face } from './InfoPanelParts'
import { groupFaceGuesses } from '../lib/groupFaces'
import { C } from './tokens'

/**
 * "Is this Amelia?"
 *
 * The archive scores every unnamed face against the people it already knows,
 * and when one person is clearly ahead it says so here, under the people, as
 * a question with two answers. Tagging a face otherwise costs four actions —
 * click the crop, type a name, wait, pick from the list — which is why
 * 215,000 faces are still unnamed. This is one click.
 *
 * Phrased as a question, not an announcement, because the machine is
 * sometimes wrong and this archive is full of people who look like each
 * other. Nothing is written until somebody says yes.
 *
 * No is worth as much as yes: it goes to the brain as a rejection, so the
 * same wrong guess is not offered again tomorrow. The face stays unnamed —
 * it is still somebody, just not her.
 */
export function FaceGuess({ path, guesses, onConfirm, onReject }) {
  const [busy, setBusy] = useState(null)
  // Questions already answered — but only for the photograph in front of
  // you. This component stays mounted while you page through the lightbox
  // with the chevrons, so without the path in the state, saying yes to
  // Guillaume here suppressed the question about Guillaume on the next
  // photograph too. It came back on a browser refresh, because that remounts
  // and empties the set, which is what made it look so arbitrary.
  //
  // Reset during render rather than in an effect: an effect would show the
  // stale list for one pass first.
  const [answered, setAnswered] = useState({ path, done: new Set() })
  if (answered.path !== path) setAnswered({ path, done: new Set() })
  const done = answered.path === path ? answered.done : new Set()

  // One question per person. Five frames of Guillaume in one video is one
  // question, and answering it claims all five — they were judged to be him
  // by the same margin that makes the question worth asking.
  const open = groupFaceGuesses(guesses).filter(g => !done.has(g.person_id))
  if (!open.length) return null

  const answer = async (g, fn) => {
    setBusy(g.person_id)
    try {
      await fn(g, g.person_id)
      // Drop the question either way. Confirming moves the face into People
      // on the next refresh, and rejecting means the brain will not offer it
      // again — leaving it on screen would invite a second answer to a
      // question already settled.
      setAnswered(prev => ({ path, done: new Set(prev.done).add(g.person_id) }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {open.map(g => (
        <div
          key={g.person_id}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: 6, borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.surface,
          }}
        >
          <Face src={g.crop_url} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, lineHeight: 1.3 }}>
              Is this <strong style={{ fontWeight: 500 }}>{g.name}</strong>?
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
              {Math.round((g.score || 0) * 100)}% alike
              {g.face_indexes.length > 1 && ` · ${g.face_indexes.length} frames`}
            </div>
          </div>

          <button
            type="button"
            disabled={busy != null}
            onClick={() => answer(g, onReject)}
            aria-label={`No, that is not ${g.name}`}
            title="No — and do not suggest them for this face again"
            style={{ ...round, opacity: busy != null ? 0.5 : 1 }}
          >
            <X size={13} />
          </button>
          <button
            type="button"
            disabled={busy != null}
            onClick={() => answer(g, onConfirm)}
            aria-label={`Yes, this is ${g.name}`}
            title={`Yes, this is ${g.name}`}
            style={{
              ...round,
              border: 0, background: C.activeText, color: '#fff',
              opacity: busy != null ? 0.5 : 1,
            }}
          >
            <Check size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

const round = {
  display: 'grid', placeItems: 'center', flexShrink: 0,
  width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
  border: `1px solid ${C.border}`, background: 'transparent', color: C.text,
}
