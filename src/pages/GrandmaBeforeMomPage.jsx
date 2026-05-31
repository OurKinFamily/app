import { Link } from 'react-router-dom'

// Demo Room 3 — Dorothy Chooljian's life, before Mom (Patty) was born.
// Pre-1961. Salisbury or earlier residence (TBD from data).
//
// This is the deep-time end of the demo arc. Demonstrates:
//   - palette desaturation continuing into actual monochrome
//   - era styling: 1940s-50s, serif type, restrained chrome
//   - household = ancestors only — Dorothy + Eddie + the older daughters as kids
//     (Diane, Donna, Debbie). Patty doesn't exist yet.
//   - era audio: WWII-era / mid-century ambient as placeholder
//   - "today" widget reframed: anniversaries from THAT era, not the calendar today
//
// Paper-napkin — all values are placeholders to demonstrate the time-shift.

export function GrandmaBeforeMomPage() {
  return (
    <div
      className="min-h-screen text-zinc-300"
      // Deep-time palette — monochrome, slight sepia. Mirrors how
      // 1940s-50s photographs themselves render. Per
      // feedback_time_and_space_navigation.md "color enters the world as time moves forward".
      style={{
        background:
          'linear-gradient(180deg, #1a1815 0%, #14130f 60%, #0c0b09 100%)',
        // Subtle grayscale-leaning feel via overlay handled at app theme level
        // eventually — for POC, dark warm-monochrome is enough hint.
      }}
    >
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10">
          <h1
            className="text-3xl font-light tracking-tight text-zinc-100"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            Dorothy. Before Patty.
          </h1>
          <p className="mt-2 text-[13px] text-zinc-500">
            Pre-1961. Color hasn't entered the world yet. You're inside her life,
            in an era your mother wasn't born into.
          </p>
        </header>

        <Zone title="Atmosphere" subtitle="Monochrome. Quiet. Heavier.">
          <p className="text-[12px] text-zinc-500">
            TODO — palette pulled from actual pre-1961 photos of Dorothy
            (heritage scans, Chooljian family albums). Black-and-white with the
            warm yellow of aged silver-gelatin prints. Ambient sound: maybe a
            single big-band track at low volume. Heavy paper texture overlay.
          </p>
        </Zone>

        <Zone title="Shelf" subtitle="What lived in Dorothy's life">
          <p className="text-[12px] text-zinc-500">
            TODO — Eddie & Dorothy's wedding album. Letters. Heritage scrapbook
            pages. The births of Diane (1951), Donna (1954), Debbie (1957).
            Patty doesn't appear yet — that's the point.
          </p>
        </Zone>

        <Zone title="Household — Chooljian, late 1950s" subtitle="Patty isn't here">
          <p className="text-[12px] text-zinc-500">
            TODO — Eddie + Dorothy + Diane (as a child) + Donna (smaller) + Debbie
            (a baby). All photos from the era. Click any → step into their own
            (person, era) room. The empty spot where Patty WILL BE is part of the
            atmosphere — quietly absent.
          </p>
        </Zone>

        <Zone title="The era's pulse" subtitle="What was happening then">
          <p className="text-[12px] text-zinc-500">
            TODO — newspaper headlines from that week. WWII memory still warm in
            mid-50s adults. Eddie's work. The Salisbury neighborhood that year.
            Sourced from heritage docs + AI fill-in clearly labeled when guessed.
          </p>
        </Zone>

        <Zone title="Doors" subtitle="Walk forward in time or sideways across people">
          <div className="mt-1 flex flex-col gap-2 text-[13px]">
            <DemoDoor to="/home/mom-childhood">
              → Forward to 1965 (Patty exists now — Salisbury house, in color)
            </DemoDoor>
            <DemoDoor to="/">
              ↺ All the way home (present day, your house)
            </DemoDoor>
          </div>
          <p className="mt-3 text-[11px] text-zinc-600">
            TODO — left/right arrows would scrub the year. Each step backward
            removes a person who hadn't been born yet. Each step forward adds them.
            Walking through generations literally.
          </p>
        </Zone>

        <footer className="mt-12 border-t border-zinc-800/60 pt-4 text-[11px] text-zinc-600">
          room 3 of 3 · paper-napkin · deep-time / B&W placeholder · iterate the heritage schema
        </footer>
      </div>
    </div>
  )
}

function Zone({ title, subtitle, children }) {
  return (
    <section className="mb-6 rounded-xl border border-dashed border-zinc-700/50 bg-zinc-900/40 px-5 py-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-medium text-zinc-200">{title}</h2>
        <span className="text-[11px] text-zinc-600">{subtitle}</span>
      </div>
      <div className="text-zinc-400">{children}</div>
    </section>
  )
}

function DemoDoor({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-block rounded-md border border-zinc-600/50 bg-zinc-800/50 px-3 py-1.5 text-zinc-200 transition-colors hover:border-zinc-400/60 hover:bg-zinc-700/60 hover:text-zinc-50"
    >
      {children}
    </Link>
  )
}
