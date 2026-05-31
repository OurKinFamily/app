// HomePage — fresh napkin v2.
// Flat. No 3D effects, no light beams, no perspective tricks.
//
// Two-section layout:
//   Hero (top)    — wall color  (#c79277)
//   Body (bottom) — off-white   (#fffdee)
//
// Build content into the zones from here. Routes still intact:
//   /                        — this page
//   /home/mom-childhood      — Patty's childhood house, Salisbury 1965
//   /home/grandma-before-mom — Dorothy's life pre-1961

const ROOM = {
  hero:    '#c79277',  // wall color
  body:    '#fffdee',  // off-white
}

export function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: ROOM.body }}>
      <section
        className="w-full"
        style={{ background: ROOM.hero, minHeight: '40vh' }}
      >
        {/* Hero content goes here */}
      </section>
      <section className="w-full">
        {/* Body content goes here */}
      </section>
    </div>
  )
}
