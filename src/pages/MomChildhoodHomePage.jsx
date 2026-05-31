import { Link } from 'react-router-dom'

// Demo Room 2 — Patty's childhood house. Salisbury, MA, 1960s.
//
// Same room shape as HomePage but at a DIFFERENT (place, era) anchor.
// Demonstrates:
//   - palette shift away from Stephen's peach toward Salisbury / ocean / mid-century warm
//   - era-appropriate desaturation (not B&W yet, but pulled-back saturation
//     and warmer cast — see feedback_time_and_space_navigation.md)
//   - household swap: 1960s residents = Eddie + Dorothy + Patty as a child + her sisters
//   - era ambient hint: stock 1960s music as a placeholder + (eventually) actual
//     family audio if any 1960s Chooljian recordings survive
//
// Paper-napkin — palette is suggested via simple CSS gradients + warm tones,
// not yet derived from real Salisbury Beach photos. That's the schema work.

export function MomChildhoodHomePage() {
  return (
    <div
      className="min-h-screen text-stone-200"
      // PLACEHOLDER palette — ocean + sand + mid-century warm. Eventually derived
      // from actual photos of the Salisbury house (Chooljian-family geotag cluster).
      style={{
        background:
          'linear-gradient(180deg, #0f1f2c 0%, #1a2a35 40%, #2a2620 100%)',
      }}
    >
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10">
          <h1
            className="text-3xl font-light tracking-tight text-amber-100"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            Salisbury, 1965.
          </h1>
          <p className="mt-2 text-[13px] text-stone-400">
            You've walked into Patty's childhood house. Ocean's outside the window.
            Atmosphere, household, and the year itself are different — same room concept.
          </p>
        </header>

        <Zone title="Atmosphere" subtitle="Salisbury Beach. Ocean light. Mid-century warm.">
          <p className="text-[12px] text-stone-400">
            TODO — palette derived from Chooljian-family photos taken at Salisbury
            (GPS cluster near 42.84655, -70.86163). Soft seafoam, sand, mid-century
            wood and brass. Maybe a faint ocean-sound bed. Time-and-space dressing:
            colors pulled back vs Stephen's present-day room; warmth carried by
            Kodachrome-era yellow-orange cast.
          </p>
        </Zone>

        <Zone title="Shelf" subtitle="What Patty had in 1965 (not what she has now)">
          <p className="text-[12px] text-stone-400">
            TODO — albums + heirlooms scoped to era. The 1960s Chooljian albums.
            Her baby book. Photos of her as a kid (1961-1969). Eddie & Dorothy's
            wedding album if any.
          </p>
        </Zone>

        <Zone title="Household — 1965 Chooljian house" subtitle="Who lived here, that year">
          <p className="text-[12px] text-stone-400">
            TODO — Eddie + Dorothy + Diane + Donna + Debbie + Patty (4 years old)
            + the D Twins (4 years old). Faces from photos taken IN 1965. Click
            any → enter their own person+era room.
          </p>
        </Zone>

        <Zone title="Today (in this era)" subtitle="What was happening this week, this year">
          <p className="text-[12px] text-stone-400">
            TODO — "Patty turned 4 this past April." "This was the year Diane
            started high school." Era-scoped anniversaries surfaced from heritage
            data, not from today's calendar.
          </p>
        </Zone>

        <Zone title="Doors" subtitle="Where do you walk from here?">
          <div className="mt-1 flex flex-col gap-2 text-[13px]">
            <DemoDoor to="/">
              ↺ Back to your house (present day, your kids, peach walls)
            </DemoDoor>
            <DemoDoor to="/home/grandma-before-mom">
              ← Grandma Dorothy's life, before Mom was born (pre-1961)
            </DemoDoor>
          </div>
          <p className="mt-3 text-[11px] text-stone-500">
            TODO — left/right arrows would walk the YEAR (1962 ← 1965 → 1968).
            Forward/back arrows would step DEEPER (out to Salisbury Beach, in to
            a specific room of the house). Per the time+space axis assignment.
          </p>
        </Zone>

        <footer className="mt-12 border-t border-stone-700/40 pt-4 text-[11px] text-stone-500">
          room 2 of 3 · paper-napkin · 1960s placeholder palette · iterate the era schema
        </footer>
      </div>
    </div>
  )
}

function Zone({ title, subtitle, children }) {
  return (
    <section className="mb-6 rounded-xl border border-dashed border-stone-600/40 bg-stone-900/30 px-5 py-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-medium text-amber-50/90">{title}</h2>
        <span className="text-[11px] text-stone-500">{subtitle}</span>
      </div>
      <div className="text-stone-300">{children}</div>
    </section>
  )
}

function DemoDoor({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-block rounded-md border border-stone-500/40 bg-stone-800/40 px-3 py-1.5 text-stone-200 transition-colors hover:border-stone-300/60 hover:bg-stone-700/40 hover:text-amber-50"
    >
      {children}
    </Link>
  )
}
