import { Avatar } from '../Avatar'
import { FaceStrip } from './FaceStrip'
import { mediaUrl } from '../../../lib/media'
import { C } from '../tokens'

/**
 * "These faces look about equally like two people."
 *
 * Which is exactly the case a machine should not decide. It happens most
 * between a parent and their child at the same age, and between siblings —
 * the two situations where getting it wrong is both most likely and least
 * forgivable.
 *
 * So both candidates are shown with their scores and the reader picks. No
 * default, no highlighted option: a nudge here is the machine deciding after
 * all.
 */
export function AmbiguousCard({ entry, onPick, onOpenPhoto, busy }) {
  return (
    <article style={card}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <strong style={{ fontSize: 14, fontWeight: 500 }}>Could be either</strong>
        <span style={{ fontSize: 11.5, color: C.muted }}>
          {entry.n_faces.toLocaleString()} faces
        </span>
      </header>

      <FaceStrip faces={entry.samples || []} onOpenPhoto={onOpenPhoto} size={52} />

      <div style={{
        display: 'grid', gap: 8, marginTop: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      }}>
        {(entry.candidates || []).map(candidate => (
          <button
            key={candidate.person_id}
            type="button"
            onClick={() => onPick(entry, candidate)}
            disabled={busy}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              padding: '8px 10px', borderRadius: 10, cursor: busy ? 'default' : 'pointer',
              border: `1px solid ${C.border}`, background: C.bg,
              font: 'inherit', color: C.text,
            }}
          >
            <Avatar
              name={candidate.person_name}
              src={candidate.person_avatar ? mediaUrl(candidate.person_avatar) : null}
              size={30}
            />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{
                display: 'block', fontSize: 13,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {candidate.person_name}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: C.muted }}>
                {Math.round((candidate.similarity || 0) * 100)}% alike
              </span>
            </span>
          </button>
        ))}
      </div>
    </article>
  )
}

const card = {
  border: `1px solid ${C.border}`, borderRadius: 12,
  padding: 14, marginBottom: 12, background: C.bg,
}
