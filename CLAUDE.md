# ourkin — app

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

**Always** write tests for new changes:

- New helper / pure function → unit test in `tests/unit/`.
- New component or prop → unit test that asserts the behavior the prop
  unlocks.
- Bug fix → **regression test** with a `// regression(YYYY-MM-DD)`
  comment on the load-bearing assertion (see `tests/unit/CLAUDE.md`).
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
