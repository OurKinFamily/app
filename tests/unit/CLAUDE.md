# app/tests/unit — Rules for Writing Unit Tests

Read this before generating or editing anything in `tests/unit/`. These rules
exist so the suite stays fast, honest, and useful — and so the work of
adding more tests doesn't degrade into churn.

## Layout

- Mirror `src/`. A test for `src/components/Foo.jsx` lives at
  `tests/unit/components/Foo.test.jsx`. A test for `src/lib/bar.js` lives at
  `tests/unit/lib/bar.test.js`.
- Test file basename matches the source basename. One file per source unit
  is the default — split only when one source genuinely exports multiple
  concerns.
- File extension: `.test.jsx` if the test renders React, otherwise `.test.js`.
- Imports go up three levels: `import { Foo } from '../../../src/components/Foo'`.

## Don't query by class name

- No `expect(el.className).toContain(...)`, no `toHaveClass`, no selectors
  like `.text-red-400`. Tailwind classes are styling, not contracts —
  asserting on them ties the test to incidental output that changes
  every refactor.
- Visual correctness (colors, sizes, spacing, layout) is not a unit-test
  concern. It belongs to **e2e** and **visual regression** (Playwright
  screenshot diffs, planned).
- Unit tests assert behavior: structure (which element rendered, with
  what role / alt / text), event handlers fired, props reached the right
  place via attributes the consumer relies on, returned values from
  helpers.

## Don't mock to dodge setup

Mock external boundaries. Never mock the unit under test or its real
collaborators just because a real render is annoying to set up.

OK to mock:
- `fetch` / network calls
- `Date.now()` / timers (`vi.useFakeTimers()`)
- `Math.random()`
- `localStorage` when behavior depends on absent/preset values
- Third-party SDKs that hit external services

NOT OK:
- Mocking the component under test (you'd be testing the mock)
- Mocking a child component because it pulls in a router / context —
  set up the router / context, OR move the test to e2e
- Mocking your own helper because the real one is slow — fix the helper
  or test at the right level
- Stubbing React hooks (`useState`, `useEffect`) — you're testing React
- "Just enough" stubs that make the assertion pass — testing the stub

Smell test: if you're writing more lines of `vi.mock` than test body,
you're testing the wrong thing. Either lift to e2e or push the logic
into a pure helper. Ask: *would this test catch the bug if the real code
were broken?* If "no, the mocks make it always pass" — delete it.

## Describe / it style

- Nest `describe` blocks freely. Names should compose into plain English
  when vitest prints them.

  ```js
  describe('Avatar', () => {
    describe('when a src is provided', () => {
      it('renders an <img>', () => { ... })
      it('uses name as the alt text', () => { ... })
    })
    describe('when no src is given', () => {
      it('falls back to initials', () => { ... })
    })
  })
  ```

  Reads as *"Avatar — when a src is provided — renders an `<img>`"*.

- `describe('Subject')` — noun (component name, function name).
- `describe('when …')` / `describe('with …')` — scenario / inputs.
- `it('<verb phrase>')` — what it does. **No `it('should …')`** — drop
  "should", goes without saying.
- One behavior per `it`. Don't bundle five unrelated assertions.

## Setup: one place, parameterized

- Don't copy-paste `render(<Foo prop="..." />)` into every test.
- Shared invariants → `beforeEach`.
- Per-test variation → a local `setupX(args)` factory inside the
  `describe` that returns whatever the tests need.

  ```js
  function renderTag(props = {}) {
    return render(<Tag {...props}>{props.children ?? 'x'}</Tag>)
  }

  describe('Tag', () => {
    it('renders its children', () => {
      renderTag({ children: 'hello' })
      expect(screen.getByText('hello')).toBeInTheDocument()
    })
    it('applies a custom color', () => {
      renderTag({ children: 'c', color: '#f0a' })
      expect(screen.getByText('c')).toHaveStyle({ color: '#f0a' })
    })
  })
  ```

- Use `it.each([...])` for tabular variations of the same assertion.

## Query priority

Prefer `@testing-library/react` queries in this order:

1. `getByRole` — closest to how a user finds the thing
2. `getByText` / `getByLabelText` / `getByAltText`
3. `getByTestId` — only when the above are too brittle or ambiguous

Each new `data-testid` is a contract you have to maintain. Add one only
when (a) e2e needs a stable hook, or (b) accessibility queries can't
disambiguate.

## What to cover (and in what order)

1. **Pure helpers** — `lib/*`, format/parse/sort functions. Cheap, fast,
   big value-per-line.
2. **Leaf components** — `Avatar`, `Tag`, `Dot`, `Button`. Stateless, no
   network, no router.
3. **Stateful components / hooks** — `useFavorites`, `useGallery`,
   `MediaGallery` shelf-packing. Mock `fetch`; don't pull in the router
   unless the component genuinely depends on it.
4. **Page-level containers** — last priority for unit tests. Most of
   their value is covered better by e2e.

## Don'ts (consolidated)

- Don't hit the network.
- Don't depend on real API data shape — build minimum literals inline.
- Don't snapshot whole components.
- Don't test third-party libraries (React, react-router, lucide-react).
- Don't import from `src/main.jsx` or `src/App.jsx` — that's e2e
  territory.
- Don't share state between tests; `cleanup()` runs after each test
  (see `tests/setup.js`).
- Don't assert on class names or styles — see top section.
- Don't mock to dodge setup — see top section.

## Speed

- Aim for < 10 ms per test. Full unit suite well under one second on a
  warm cache. A slow test usually means real I/O, a real render of too
  much, or the wrong test level.

## Coverage

- `npm run test:coverage` → HTML report at `coverage/`.
- **Target: 100%** across `src/lib/**` and `src/components/**`. Thresholds
  enforced in `vitest.config.js` (statements/branches/functions/lines all
  100). Suite fails below.
- **Enforced on push.** Husky `pre-push` runs `npm run test:coverage` —
  pushing a branch that drops below 100% is blocked at the local hook
  before it reaches the remote. Pre-commit stays fast (lint + related
  tests only); pre-push is where the coverage gate lives.
- Pages (`src/pages/**`) are not in scope here — their value is in
  `tests/e2e/`.

**`/* v8 ignore */` is a last resort, not a convenience.**

If a line "can't realistically be reached," ask why it exists. Most
defensive `if (!x) return null` checks are either:

- Dead code that should be deleted (we can prove the input is never
  null at every call site), or
- A real edge case that *is* reachable — in which case write the test.

Don't reach for `/* v8 ignore */` to hit the coverage number. Question
the code first. Allowed cases are narrow:

- File-level `/* v8 ignore file */` for components that genuinely need a
  real browser (canvas-backed Leaflet maps, native swipe). Pair with a
  `// reason: <why>` comment.
- A handful of truly unreachable branches where deleting the defensive
  check would make the call sites worse — write a comment explaining
  why the line stays.

## Every bug gets a test (non-negotiable)

When a bug is found, write a regression test **before** (or alongside)
the fix. The test must fail on the unfixed code and pass after the fix.

- Comment the assertion so future-you knows it's load-bearing:

  ```js
  it('preserves face_index per-edge when one photo has multiple faces', () => {
    // regression(2026-05-27): MERGE pattern omitted face_index, so faces
    // from the same photo collapsed onto a single APPEARS_IN edge.
    expect(edges.map(e => e.face_index).sort()).toEqual([0, 1, 2])
  })
  ```

- Tag format: `// regression(YYYY-MM-DD): <one-line cause>`. Include
  enough that someone can grep for it.
- Never delete a regression test "because the code that broke is gone."
  The test is cheap; the regression isn't.
- If the bug only manifests across a real boundary (route change,
  network race, DOM layout), the regression test goes in `tests/e2e/`,
  not here — but it still gets written.

## When in doubt

- New helper or pure function: write a test.
- New component prop: test the new behavior, don't backfill the whole
  component.
- Bug fix: see above — required.
- User-flow-shaped (navigate, click, see result across pages): belongs
  in `tests/e2e/`, not here.
