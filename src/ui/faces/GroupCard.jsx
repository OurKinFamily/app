import { useState } from 'react'
import { Check, Maximize2, X } from 'lucide-react'
import { Avatar } from '../Avatar'
import { FaceStrip } from './FaceStrip'
import { faceTiles, tileCoverage } from '../../lib/faceTiles'
import { mediaUrl } from '../../lib/media'
import { C } from '../tokens'

/**
 * "These faces look like somebody you have already named."
 *
 * The strongest suggestion the archive makes, and the one worth being careful
 * about: confirming attaches every face at once, and a single stranger in the
 * set becomes a wrong claim about a family member that nobody will notice for
 * years. So the faces are shown before the button, not after it, and any of
 * them can be clicked out of the batch first.
 */

const PREVIEW = 60

export function GroupCard({ group, onConfirm, onDismiss, onInspect, onOpenPhoto, busy }) {
  const [excluded, setExcluded] = useState(() => new Set())
  const [expanded, setExpanded] = useState(false)

  // Every cluster gets a tile, then the leftover room goes on second and
  // third crops — see lib/faceTiles. Showing one per cluster put "Confirm 4"
  // under two thumbnails.
  const { tiles: faces, hidden } = faceTiles(group.clusters, expanded ? null : PREVIEW)

  const keeping = group.clusters.filter(c => !excluded.has(c.cluster_id))
  const facesKept = keeping.reduce((sum, c) => sum + c.n_faces, 0)
  const coverage = expanded && !hidden ? tileCoverage(faces.length, group.n_faces) : null

  const toggle = id => setExcluded(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  return (
    <article style={card}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <Avatar
          name={group.person_name}
          src={group.person_avatar ? mediaUrl(group.person_avatar) : null}
          size={40}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15 }}>
            {group.person_name}
            {group.person_known_as && (
              <span style={{ color: C.muted, fontSize: 12.5 }}> ({group.person_known_as})</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
            {group.n_faces.toLocaleString()} suggested ·{' '}
            {Math.round((group.avg_similarity || 0) * 100)}% alike ·{' '}
            {group.person_n_total.toLocaleString()} already confirmed
          </div>
        </div>
      </header>

      <FaceStrip
        faces={faces}
        excluded={excluded}
        onToggle={toggle}
        onOpenPhoto={onOpenPhoto}
      />

      {hidden > 0 && (
        <button type="button" onClick={() => setExpanded(true)} style={link}>
          Show {hidden.toLocaleString()} more
        </button>
      )}

      {/* Only once there is nothing left to expand, so it reads as the real
          ceiling rather than something another click would fix. */}
      {coverage && (
        <div style={{ fontSize: 11.5, color: C.muted, paddingTop: 8 }}>{coverage}</div>
      )}

      <footer style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: 11.5, color: C.muted, flex: 1 }}>
          {excluded.size > 0
            ? `${excluded.size} set aside · ${facesKept.toLocaleString()} will be confirmed`
            : 'Click any face to leave it out'}
        </span>

        {onInspect && (
          <button
            type="button"
            onClick={() => onInspect(group.clusters[0]?.cluster_id, group.person_id, group.person_name)}
            title="Look through this group properly"
            style={ghost}
          >
            <Maximize2 size={14} />
          </button>
        )}
        <button type="button" onClick={() => onDismiss(group)} disabled={busy} style={ghost}>
          <X size={14} /> Not now
        </button>
        <button
          type="button"
          onClick={() => onConfirm(group, keeping)}
          disabled={busy || !keeping.length}
          style={{ ...primary, opacity: busy || !keeping.length ? 0.5 : 1 }}
        >
          <Check size={14} /> Confirm {facesKept.toLocaleString()}
        </button>
      </footer>
    </article>
  )
}

const card = {
  border: `1px solid ${C.border}`, borderRadius: 12,
  padding: 14, marginBottom: 12, background: C.bg,
}
const ghost = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 30, padding: '0 12px', borderRadius: 15, fontSize: 12.5,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}
const primary = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 30, padding: '0 14px', borderRadius: 15, fontSize: 12.5,
  border: 0, background: C.activeText, color: '#fff', cursor: 'pointer',
}
const link = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 12, cursor: 'pointer', padding: '8px 0 0',
}
