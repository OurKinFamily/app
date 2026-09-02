import { C } from './tokens'

/**
 * Three dots, pulsing in sequence.
 *
 * Replaces the word "Loading…", which in a gallery is both louder and less
 * informative than it looks — you are already looking at photographs, and a
 * line of text arriving under them reads as content rather than as a state.
 *
 * Honours prefers-reduced-motion by holding still rather than disappearing:
 * somebody who has asked for less movement still needs to know it is working.
 */
export function LoadingDots({ label = 'Loading' }) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 6, padding: '28px 0',
      }}
    >
      <style>{`
        @keyframes v2-dot {
          0%, 80%, 100% { opacity: .22; transform: scale(.8) }
          40%           { opacity: 1;   transform: scale(1) }
        }
        @media (prefers-reduced-motion: reduce) {
          .v2-dot { animation: none !important; opacity: .45 !important }
        }
      `}</style>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="v2-dot"
          style={{
            width: 7, height: 7, borderRadius: '50%', background: C.muted,
            // Staggered rather than simultaneous: three dots blinking together
            // is a flash, not a rhythm.
            animation: `v2-dot 1.1s ${i * 0.16}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  )
}
