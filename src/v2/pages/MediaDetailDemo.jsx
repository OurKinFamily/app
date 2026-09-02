import { useState } from 'react'
import { MediaDetail } from '../ui/MediaDetail'
import { DETAIL_FIXTURES } from './detailFixtures'
import { C } from '../ui/tokens'

/**
 * Opens the detail view on real photographs with deliberately different
 * amounts known about them.
 *
 * A metadata panel is easy to design against one well-described photograph and
 * quite different against a scan with nothing but a filename. Every row hides
 * itself when it has nothing to say, and the only way to see whether that holds
 * up is to look at the sparse cases too.
 *
 * The metadata is FROZEN — captured from the real API and then pinned. A style
 * guide that fetches live data stops being a reference: the sparse example
 * quietly becomes a rich one the moment somebody dates that photograph, and the
 * layout it was meant to demonstrate is never seen again. The pictures still
 * load from /api/media, so these look real; only the facts are held still.
 */
const EXAMPLES = [
  {
    key: 'rich',
    label: 'Everything',
    hint: 'tagged person, place, landmark, camera, colours',
  },
  {
    key: 'some',
    label: 'Some of it',
    hint: 'camera and date, no place, two faces awaiting names',
  },
  {
    key: 'minimal',
    label: 'Barely anything',
    hint: 'no date at all — a scan or an old film',
  },
]

export function MediaDetailDemo() {
  const [open, setOpen] = useState(null)
  const [favourited, setFavourited] = useState(false)
  const [note, setNote] = useState(null)

  return (
    <>
      <div style={{ display: 'grid', gap: 10 }}>
        {EXAMPLES.map(ex => {
          const item = DETAIL_FIXTURES[ex.key]?.item
          return (
            <div key={ex.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                disabled={!item}
                onClick={() => setOpen(ex.key)}
                style={{
                  height: 34, padding: '0 16px', borderRadius: 17, border: 0,
                  background: C.activeBg, color: C.activeText,
                  fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                  cursor: item ? 'pointer' : 'default', opacity: item ? 1 : 0.45,
                }}
              >
                {ex.label}
              </button>
              <span style={{ fontSize: 12, color: C.muted }}>
                {ex.hint}
              </span>
            </div>
          )
        })}
      </div>

      {note && (
        <p style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>Last action: {note}</p>
      )}

      {open && DETAIL_FIXTURES[open] && (
        <MediaDetail
          item={DETAIL_FIXTURES[open].item}
          detail={DETAIL_FIXTURES[open].detail}
          onClose={() => setOpen(null)}
          favourited={favourited}
          onToggleFavourite={() => setFavourited(v => !v)}
          onRotate={() => setNote('rotate')}
          onDownload={() => setNote('download')}
          onAddToAlbum={() => setNote('add to album')}
          onDelete={() => setNote('delete')}
          // Reports rather than writes: a style guide that edits the real
          // archive is a style guide nobody dares click.
          onDismissFace={face => setNote(`dismiss face ${face.face_index}`)}
          onAssignFace={(face, person) =>
            setNote(`assign face ${face.face_index} → ${person.name}`)}
          onCreatePerson={(face, name) =>
            setNote(`create “${name}” and assign face ${face.face_index}`)}
          onRelocate={(it, patch) =>
            setNote(`relocate → ${patch.place_name || `${patch.latitude}, ${patch.longitude}`}`)}
          onRedate={(it, patch) =>
            setNote(`redate → ${patch.timestamp.slice(0, 10)} (${patch.precision})`)}
        />
      )}
    </>
  )
}
