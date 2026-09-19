import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

/** The two control shapes the detail view uses over a photograph. */

/** A top-bar action. Round, transparent until hovered — the same shape the
 *  tile overlays use, so the two read as one system. */
export function Action({ children, label, onClick, danger }) {
  const [over, setOver] = useState(false)
  const [pressed, setPressed] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => { setOver(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'grid', placeItems: 'center',
        width: 28, height: 28, flex: '0 0 auto',
        borderRadius: '50%', border: 0, padding: 0,
        background: pressed ? 'rgba(255,255,255,.28)'
          : over ? 'rgba(255,255,255,.16)' : 'transparent',
        color: danger && over ? '#ff6b6b' : '#fff',
        transform: pressed ? 'scale(0.9)' : 'scale(1)',
        cursor: 'pointer', outline: 'none',
        transition: 'background 120ms ease, transform 80ms ease, color 120ms ease',
      }}
    >
      {children}
    </button>
  )
}

/** A navigation control pinned to the side of the photograph. */
export function Edge({ side, children, label, onClick }) {
  const [over, setOver] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => setOver(false)}
      style={{
        position: 'absolute', top: '50%', [side]: 12, zIndex: 3,
        transform: 'translateY(-50%)',
        display: 'grid', placeItems: 'center',
        width: 44, height: 44, borderRadius: '50%', border: 0,
        background: over ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.3)',
        color: '#fff', cursor: 'pointer', outline: 'none',
        transition: 'background 120ms ease',
      }}
    >
      {children}
    </button>
  )
}

/**
 * The chevrons at either side of a photograph.
 *
 * Together rather than as two calls, because they are one idea — "there are
 * more this way" — and writing them out twice invited them to drift apart.
 */
export function Edges({ hasPrev, hasNext, onPrev, onNext }) {
  return (
    <>
      {hasPrev && (
        <Edge side="left" label="Previous" onClick={onPrev}>
          <ChevronLeft size={26} />
        </Edge>
      )}
      {hasNext && (
        <Edge side="right" label="Next" onClick={onNext}>
          <ChevronRight size={26} />
        </Edge>
      )}
    </>
  )
}
