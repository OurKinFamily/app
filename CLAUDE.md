# ourkin — app

> Part of the **ourkin stack** at `/home/stephen/Documents/ourkin/`.
> Siblings: `api`, `db`, `workers`, `workshop`, `deploy`. Read the root
> [`../CLAUDE.md`](../CLAUDE.md) for stack-wide conventions and
> [`../CLAUDE.index.md`](../CLAUDE.index.md) for the full repo map.

React frontend for the ourkin family archive.

## GitHub

https://github.com/OurKinFamily/app

## Running

```bash
npm install
npm run dev       # dev server at http://localhost:3000
npm run build     # production build
```

## Stack

- Vite + React
- Tailwind CSS
- shadcn/ui (components added as needed)

## Structure

```
src/
  lib/api.js          # all API calls — talks to /api proxy → FastAPI
  components/         # shared UI components
  pages/              # one file per page/route
  App.jsx             # root, routing lives here when added
  index.css           # Tailwind import + base styles
```

## API

All requests go through the Vite dev proxy at `/api` → `http://localhost:8000`.
No hardcoded URLs in components — everything through `src/lib/api.js`.

## Current Pages

- `PeoplePage` — lists all people, click to see relatives panel

## Coming Next

- Routing (React Router)
- Person detail page with family tree tab
- Create / edit person

## Testing — non-negotiable

### When to write tests — timing matters

**Bug fixes:** write the regression test in the same change as the fix.
The fix is locked in; the test ratchet keeps it that way.

**New UI features / iterative design work:** DO NOT jump straight to
writing tests. Land the working UI, let Stephen look at it, iterate
(layout, copy, colour, behaviour) until he confirms he likes it, *then*
write tests against the stabilised shape. Writing tests in the same
turn as a first-pass UI burns cycles because the tests get rewritten
with every iteration.

The signal to start writing tests is Stephen saying "looks good",
"ship it", "great", or moving onto a different feature.

### What to test

- New helper / pure function → unit test in `tests/unit/`.
- New component or prop → unit test that asserts the behavior the prop
  unlocks.
- Bug fix → **regression test** in `tests/unit/regression/<kebab-symptom>.spec.js`
  (one file per bug; filename names the symptom).
- New user flow that spans pages / routes / network → e2e in
  `tests/e2e/`.

**Always** run the suite locally before pushing:

```bash
npm test             # vitest unit suite
npm run e2e          # playwright e2e (requires api on :8000)
npm run lint         # eslint
```

CI runs `npm test` on every PR (`protect-main.yml`) and on push
(`deploy.yml`). Pushing red is a waste of everyone's time — catch it on
your machine.

**100% coverage is enforced.** `vitest.config.js` sets thresholds at 100
for statements/branches/functions/lines on `src/lib/**` +
`src/components/**`. Husky `pre-push` hook runs `npm run test:coverage`
— any drop below 100 blocks the push locally before it hits the remote.
See `tests/unit/CLAUDE.md` for the rules.

See `tests/unit/CLAUDE.md` for the unit-test rules (mirror src/, no
class-name queries, no mock-to-dodge-setup, BDD describes, single
setup with `setupX(args)` factory, every bug gets a test).

## Tone & wording — family-archive context

This app is a *family* archive — many of the people in it have passed
away, and family members will read these pages about their loved ones.
Default to **warm, human language over clinical/database wording**.

| Clinical | Warmer (use this) |
|---|---|
| Died | Passed |
| Place of death | Last home |
| Buried | Laid to rest |
| Immigrated | Arrived |
| Naturalized | Became citizen |
| DECEASED / status flag | (don't show; let dates speak) |
| GEDCOM id / row id / db id | hide from UI; keep on node |

When you add a new field that's a life event or biographical fact,
pick a label that sounds like something a family member would say out
loud, not what a database admin would say. If unsure, ask before
shipping a clinical default. Identifier / plumbing fields stay
hidden from the user.
