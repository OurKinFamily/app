import { X } from 'lucide-react'
import { C } from '../tokens'

/**
 * The faces in one group, with a way to cross out the ones that are not them.
 *
 * Clicking a face opens the photograph it came from — a cropped face is often
 * ambiguous where the whole picture is obvious. The cross is what says "not
 * this person", and it is deliberately a separate target from the face itself:
 * the two actions are opposite in consequence and a mis-hit either way costs
 * an undo nobody has.
 */
export function CropGrid({ faces, excluded, onToggle, onOpen }) {
  return (
    <div style={{
      display: 'grid', gap: 5,
      gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
    }}>
      {faces.map((face, i) => {
        const out = excluded.has(face.face_index)
        return (
          <div key={`${face.photo_path}-${face.face_index}-${i}`} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => face.photo_path && onOpen(face.photo_path)}
              title="See the photograph"
              style={{
                display: 'block', width: '100%', padding: 0, border: 0,
                borderRadius: 8, overflow: 'hidden', background: 'transparent',
                cursor: 'pointer', opacity: out ? 0.3 : 1,
                boxShadow: out ? `0 0 0 2px #c5221f` : 'none',
              }}
            >
              <img
                src={face.crop_url}
                alt=""
                loading="lazy"
                onError={e => { e.currentTarget.style.visibility = 'hidden' }}
                style={{
                  width: '100%', aspectRatio: '1', objectFit: 'cover',
                  background: C.hover, display: 'block',
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => onToggle(face.face_index)}
              aria-label={out ? 'Put this face back' : 'Not this person'}
              title={out ? 'Put this face back' : 'Not this person'}
              style={{
                position: 'absolute', top: -5, right: -5,
                display: 'grid', placeItems: 'center', width: 18, height: 18,
                borderRadius: '50%', cursor: 'pointer',
                border: `1px solid ${out ? '#c5221f' : C.border}`,
                background: out ? '#c5221f' : C.bg,
                color: out ? '#fff' : C.muted,
              }}
            >
              <X size={11} strokeWidth={3} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
