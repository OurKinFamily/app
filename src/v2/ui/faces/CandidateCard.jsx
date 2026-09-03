import { useState } from 'react'
import { EyeOff, Maximize2, UserPlus, X } from 'lucide-react'
import { FaceStrip } from './FaceStrip'
import { PersonSearch } from './PersonSearch'
import { C } from '../tokens'

/**
 * "These faces look like each other, and like nobody you have named."
 *
 * Four answers, and all four are ordinary: it is somebody already in the
 * archive, it is somebody new, it is a real person whose name nobody
 * remembers, or it is a stranger who should stop coming back.
 *
 * That third one matters more than it looks. Half the faces in a family
 * archive are neighbours, classmates and people at the next table — real
 * people, worth keeping together, whose names surface years later when
 * somebody older sees the picture.
 */
export function CandidateCard({
  candidate, onCreate, onAssign, onPark, onSkip, onDismiss, onInspect, onOpenPhoto, busy,
}) {
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [expanded, setExpanded] = useState(false)

  const faces = (candidate.samples || []).slice(0, expanded ? undefined : 24)
  const hidden = (candidate.samples || []).length - faces.length

  return (
    <article style={card}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <strong style={{ fontSize: 14, fontWeight: 500 }}>Somebody unnamed</strong>
        <span style={{ fontSize: 11.5, color: C.muted }}>
          {candidate.n_faces.toLocaleString()} faces
          {candidate.clusters?.length > 1 && ` · ${candidate.clusters.length} groups`}
        </span>
      </header>

      <FaceStrip faces={faces} onOpenPhoto={onOpenPhoto} size={52} />

      {hidden > 0 && (
        <button type="button" onClick={() => setExpanded(true)} style={link}>
          Show {hidden.toLocaleString()} more
        </button>
      )}

      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        <PersonSearch
          placeholder="Somebody already in the archive…"
          disabled={busy}
          onPick={p => onAssign(candidate, p.id, p.known_as || p.name)}
        />

        {naming ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) onCreate(candidate, name.trim())
                if (e.key === 'Escape') setNaming(false)
              }}
              placeholder="Their full name"
              style={field}
            />
            <button
              type="button"
              onClick={() => onCreate(candidate, name.trim())}
              disabled={busy || !name.trim()}
              style={{ ...primary, opacity: busy || !name.trim() ? 0.5 : 1 }}
            >
              Add them
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button type="button" onClick={() => setNaming(true)} disabled={busy} style={ghost}>
              <UserPlus size={13} /> Somebody new
            </button>
            <button
              type="button"
              onClick={() => onPark(candidate)}
              disabled={busy}
              title="Keep these faces together under a placeholder until somebody remembers"
              style={ghost}
            >
              Name unknown
            </button>
            <div style={{ flex: 1 }} />
            {onInspect && (
              <button
                type="button"
                onClick={() => onInspect(candidate.clusters?.[0]?.cluster_id)}
                title="Look through these properly"
                style={ghost}
              >
                <Maximize2 size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onSkip(candidate)}
              disabled={busy}
              title="A stranger — never suggest these again"
              style={ghost}
            >
              <EyeOff size={13} /> Never
            </button>
            <button type="button" onClick={() => onDismiss(candidate)} disabled={busy} style={ghost}>
              <X size={13} /> Not now
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

const card = {
  border: `1px solid ${C.border}`, borderRadius: 12,
  padding: 14, marginBottom: 12, background: C.bg,
}
const field = {
  flex: 1, height: 32, padding: '0 10px', boxSizing: 'border-box',
  border: `1px solid ${C.border}`, borderRadius: 8,
  font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
}
const ghost = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 30, padding: '0 12px', borderRadius: 15, fontSize: 12.5,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}
const primary = {
  height: 32, padding: '0 14px', borderRadius: 16, fontSize: 12.5,
  border: 0, background: C.activeText, color: '#fff', cursor: 'pointer',
}
const link = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 12, cursor: 'pointer', padding: '8px 0 0',
}
