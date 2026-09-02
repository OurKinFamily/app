import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { SectionLabel, Face } from './InfoPanelParts'
import { C } from './tokens'
import { ageAt } from './ageAt'
import { FaceAssigner } from './FaceAssigner'
import { ConfirmPopover } from './ConfirmPopover'

/**
 * Who is in the photograph, and who still needs a name.
 *
 * Both lists always show. A family archive is never fully tagged, and hiding
 * the remaining work is how it stays untagged.
 */
export function PeopleSection({
  detail: d, takenAt, hovered, onHover, canEdit,
  onAssignFace, onCreatePerson, onDismissFace, naming, onNaming,
}) {
  const [dismissing, setDismissing] = useState(null)
  // Badges appear on the face you are pointing at, not on every face at once —
  // a row of crops each wearing two buttons is a control panel, not a set of
  // faces. Focus counts too, or a keyboard user never sees them.
  const [activeFace, setActiveFace] = useState(null)
  return (
    <>
      <SectionLabel>People</SectionLabel>
      {d.people?.length ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {d.people.map(p => (
            <div
              key={p.id || p.name}
              onMouseEnter={() => onHover?.(p.face_index)}
              onMouseLeave={() => onHover?.(null)}
              style={{
                borderRadius: 6,
                outline: hovered === p.face_index ? `2px solid ${C.activeText}` : 'none',
                outlineOffset: 2,
              }}
            >
            <Face
              key={p.id || p.name}
              src={p.crop_url || p.avatar}
              // First name only. The crop already says which face; a full
              // name under a 44px square just wraps to three lines.
              name={p.known_as || (p.name || '').split(' ')[0]}
              sub={ageAt(p.birth_date, takenAt)}
            />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: C.muted }}>Nobody tagged yet</div>
      )}

      {/* Both sections show, always. A family archive is never fully tagged,
          and hiding the remaining work is how it stays untagged. */}
      {/* No heading and no count: they sit with the named faces because they
          ARE the same thing, just not answered yet. The pencil is the
          invitation — an unnamed face is a question, not a category. */}
      {d.unidentified?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {d.unidentified.map(f => (
            <button
              key={f.face_index}
              type="button"
              disabled={!canEdit}
              onClick={() => { setDismissing(null); onNaming?.(f) }}
              onMouseEnter={() => { onHover?.(f.face_index); setActiveFace(f.face_index) }}
              onMouseLeave={() => { onHover?.(null); setActiveFace(null) }}
              onFocus={() => setActiveFace(f.face_index)}
              onBlur={() => setActiveFace(null)}
              aria-label="Name this face"
              style={{
                border: 0, padding: 0, background: 'transparent',
                cursor: canEdit ? 'pointer' : 'default',
                position: 'relative', borderRadius: 6,
                outline: hovered === f.face_index ? '2px solid rgba(0,0,0,.35)' : 'none',
                outlineOffset: 2,
              }}
            >
              <Face src={f.crop_url} dim />
              {/* Dismiss, top-left, mirroring the name affordance top-right.
                  A family archive is full of strangers in the background, and
                  every one of them otherwise sits in the tagging queue for
                  ever, making the real work look endless. */}
              {canEdit && activeFace === f.face_index && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Dismiss this face"
                  onClick={e => {
                    e.stopPropagation()
                    // Only one question at a time: naming and dismissing are
                    // opposite answers to the same face.
                    onNaming?.(null)
                    setDismissing(f)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault(); e.stopPropagation()
                      onNaming?.(null); setDismissing(f)
                    }
                  }}
                  style={{
                    position: 'absolute', top: -3, left: -3, zIndex: 2,
                    display: 'grid', placeItems: 'center',
                    width: 17, height: 17, borderRadius: '50%',
                    background: C.muted, color: '#fff', cursor: 'pointer',
                    boxShadow: `0 0 0 2px ${C.bg}`,
                  }}
                >
                  <X size={9} />
                </span>
              )}
              {activeFace === f.face_index && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute', top: -3, right: -3,
                  display: 'grid', placeItems: 'center',
                  width: 17, height: 17, borderRadius: '50%',
                  background: C.activeText, color: '#fff',
                  boxShadow: `0 0 0 2px ${C.bg}`,
                }}
              >
                <Pencil size={9} />
              </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Opens under the faces rather than in a dialog: you are still looking
          at the photograph, which is the only thing that tells you who it is. */}
      {dismissing && (
        <div style={{ position: 'relative' }}>
          <ConfirmPopover
            message="Dismiss this face?"
            detail="It stops being offered for tagging. Nothing is deleted, and it can be brought back."
            confirmLabel="Yes, dismiss"
            onCancel={() => setDismissing(null)}
            onConfirm={async () => {
              await onDismissFace?.(dismissing)
              setDismissing(null)
            }}
          />
        </div>
      )}

      {naming && (
        <FaceAssigner
          onOutside={() => onNaming?.(null)}
          face={naming}
          onClose={() => onNaming?.(null)}
          onAssign={async person => {
            await onAssignFace?.(naming, person)
            onNaming?.(null)
          }}
          onCreate={async name => {
            await onCreatePerson?.(naming, name)
            onNaming?.(null)
          }}
        />
      )}

    </>
  )
}
