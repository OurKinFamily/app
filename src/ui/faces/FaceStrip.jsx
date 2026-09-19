import { useState } from 'react'
import { C } from '../tokens'

/**
 * A wall of face crops, with the ones you do not want turned off.
 *
 * Confirming a suggestion is a bulk act — often hundreds of faces at once —
 * and the only defence against one stranger riding along is being able to see
 * them all and click the wrong one out. So the thumbnails are small enough to
 * fit a lot on screen and large enough to recognise, and excluding is one
 * click with no confirmation, because it is trivially reversible.
 */
export function FaceStrip({ faces, excluded, onToggle, onOpenPhoto, size = 56 }) {
  return (
    <div style={{
      display: 'grid', gap: 4,
      gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, 1fr))`,
    }}>
      {faces.map((face, i) => (
        <Face
          key={face.crop_url || face.cluster_id || i}
          face={face}
          off={excluded?.has(face.cluster_id)}
          onToggle={onToggle && (() => onToggle(face.cluster_id))}
          onOpenPhoto={onOpenPhoto}
        />
      ))}
    </div>
  )
}

function Face({ face, off, onToggle, onOpenPhoto }) {
  const [lit, setLit] = useState(false)
  const [broken, setBroken] = useState(false)
  const src = face.crop_url || face.sample || face.url

  return (
    <div
      style={{ position: 'relative', aspectRatio: '1 / 1' }}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
    >
      <button
        type="button"
        onClick={onToggle}
        title={onToggle ? (off ? 'Put this face back' : 'Not this person') : undefined}
        style={{
          width: '100%', height: '100%', padding: 0, border: 0, borderRadius: 6,
          overflow: 'hidden', background: C.hover,
          cursor: onToggle ? 'pointer' : 'default',
          opacity: off ? 0.25 : 1,
          outline: off ? `2px solid ${C.border}` : 'none',
        }}
      >
        {/* A grey square is indistinguishable from one still loading. If the
            crop is genuinely gone, say so — the face is still assignable, and
            silently blank tiles read as a broken page. */}
        {(!src || broken) && (
          <span style={{
            display: 'grid', placeItems: 'center', width: '100%', height: '100%',
            fontSize: 9, color: C.muted, textAlign: 'center', lineHeight: 1.2,
          }}>
            no crop
          </span>
        )}
        {src && !broken && (
          <img
            src={src}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setBroken(true)}
          />
        )}
      </button>

      {/* The photograph the face came from. A crop is often too tight to judge
          — the context is what settles whether it is the right person. */}
      {onOpenPhoto && lit && face.photo_path && (
        <button
          type="button"
          onClick={() => onOpenPhoto(face.photo_path)}
          title="See the whole photograph"
          aria-label="See the whole photograph"
          style={{
            position: 'absolute', right: 2, bottom: 2,
            width: 18, height: 18, display: 'grid', placeItems: 'center',
            border: 0, borderRadius: 4, cursor: 'pointer',
            background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 11,
          }}
        >
          ⤢
        </button>
      )}
    </div>
  )
}
