import { useState } from 'react'
import { EyeOff, UserPlus } from 'lucide-react'
import { FaceStrip } from './FaceStrip'
import { PersonSearch } from './PersonSearch'
import { C } from '../tokens'

/**
 * A cluster the scoring could not place at all.
 *
 * Below the confidence bar and matching nobody — usually a handful of faces of
 * somebody who appears twice in the whole archive, sometimes a bad crop of a
 * lamp. Reviewed one at a time by hand, because there is nothing to batch on.
 *
 * Laid out as a row rather than a card: there are hundreds of these, and a
 * card each turns a working queue into a scroll.
 */
export function LeftoverRow({ cluster, onAssign, onCreate, onPark, onSkip, onOpenPhoto, busy }) {
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  return (
    <div style={{
      display: 'grid', gap: 10, alignItems: 'start', padding: '10px 0',
      gridTemplateColumns: 'minmax(160px, 260px) 1fr',
      borderTop: `1px solid ${C.border}`,
    }}>
      <div>
        <FaceStrip faces={cluster.samples || []} onOpenPhoto={onOpenPhoto} size={44} />
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
          {cluster.n_faces.toLocaleString()} {cluster.n_faces === 1 ? 'face' : 'faces'}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <PersonSearch
          disabled={busy}
          onPick={p => onAssign(cluster, p.id, p.known_as || p.name)}
        />

        {naming ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) onCreate(cluster, name.trim())
                if (e.key === 'Escape') setNaming(false)
              }}
              placeholder="Their full name"
              style={field}
            />
            <button
              type="button"
              onClick={() => onCreate(cluster, name.trim())}
              disabled={busy || !name.trim()}
              style={{ ...primary, opacity: busy || !name.trim() ? 0.5 : 1 }}
            >
              Add
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button type="button" onClick={() => setNaming(true)} disabled={busy} style={ghost}>
              <UserPlus size={13} /> Somebody new
            </button>
            <button type="button" onClick={() => onPark(cluster)} disabled={busy} style={ghost}>
              Name unknown
            </button>
            <button type="button" onClick={() => onSkip(cluster)} disabled={busy} style={ghost}>
              <EyeOff size={13} /> Never
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const field = {
  flex: 1, height: 30, padding: '0 10px', boxSizing: 'border-box',
  border: `1px solid ${C.border}`, borderRadius: 8,
  font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
}
const ghost = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 28, padding: '0 11px', borderRadius: 14, fontSize: 12,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}
const primary = {
  height: 30, padding: '0 12px', borderRadius: 15, fontSize: 12.5,
  border: 0, background: C.activeText, color: '#fff', cursor: 'pointer',
}
