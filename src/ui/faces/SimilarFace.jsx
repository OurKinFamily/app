import { useState } from 'react'
import { C } from '../tokens'

/**
 * One candidate from a similarity sweep, with its score.
 *
 * The number is not decoration. A sweep at 45% returns confident matches
 * and wild guesses side by side, and it is the only thing separating them —
 * so it sits on the face rather than in a tooltip nobody opens.
 */
export function SimilarFace({ face, picked, onToggle, onOpen }) {
  const [lit, setLit] = useState(false)
  const pct = Math.round((face.similarity || 0) * 100)

  return (
    <div
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        onClick={onToggle}
        title={`${pct}% alike — ${face.photo_path}`}
        style={{
          width: '100%', aspectRatio: '1 / 1', padding: 0, borderRadius: 8,
          overflow: 'hidden', cursor: 'pointer', background: C.hover,
          border: `2px solid ${picked ? C.activeText : 'transparent'}`,
        }}
      >
        <img
          src={face.crop_url}
          alt=""
          loading="lazy"
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            opacity: picked ? 0.75 : 1,
          }}
        />
      </button>

      {/* The score, always. A sweep at 45% returns confident matches and wild
          guesses side by side, and the number is the only thing separating
          them. */}
      <span style={{
        position: 'absolute', left: 4, top: 4,
        padding: '1px 5px', borderRadius: 999, fontSize: 10,
        background: 'rgba(0,0,0,.6)', color: '#fff',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {pct}%
      </span>

      {lit && (
        <button
          type="button"
          onClick={onOpen}
          title="See the whole photograph"
          aria-label="See the whole photograph"
          style={{
            position: 'absolute', right: 4, top: 4,
            width: 20, height: 20, display: 'grid', placeItems: 'center',
            border: 0, borderRadius: 5, cursor: 'pointer',
            background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 11,
          }}
        >
          ⤢
        </button>
      )}
    </div>
  )
}
