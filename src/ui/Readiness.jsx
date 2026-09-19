import { SectionLabel } from './InfoPanelParts'
import { C } from './tokens'

/**
 * mpp's own verdict on whether this file is fully described.
 *
 * A per-photograph to-do list, and the thing that turns the archive into
 * something you can improve rather than only browse — "missing: gps" is an
 * instruction, where a blank Place row is just an absence.

 * The gaps are named in the archive's own vocabulary — "gps", "perceptual" —
 * which means nothing to somebody looking at a photograph of their family.
 */
const FRIENDLY = {
  gps: 'where it was taken',
  date: 'when it was taken',
  md5: 'a fingerprint',
  perceptual: 'a visual fingerprint',
  dateConfidence: 'a reliable date',
}

const friendly = k => FRIENDLY[k] || k

export function Readiness({ readiness: r }) {
  if (!r) return null
  const d = { readiness: r }
  return (
    <>
          <SectionLabel>What we know</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              flex: 1, height: 4, borderRadius: 2, background: C.hover, overflow: 'hidden',
            }}>
              <div style={{
                width: `${d.readiness.score ?? 0}%`, height: '100%',
                background: (d.readiness.score ?? 0) === 100 ? '#1e8e3e' : C.activeText,
              }} />
            </div>
            <span style={{ fontSize: 11.5, color: C.muted }}>
              {d.readiness.score}/100
            </span>
          </div>
          {d.readiness.missing?.length > 0 && (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
              Still missing: {d.readiness.missing.map(friendly).join(', ')}
            </div>
          )}
    </>
  )
}
