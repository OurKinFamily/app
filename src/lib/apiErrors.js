/**
 * Say so when an API request fails.
 *
 * Most of this app calls `fetch` directly and, on a bad response, quietly
 * returns — `if (!res.ok) return`. That was deliberate once: a failed request
 * should not throw away the page. But it means a save that does not happen
 * looks exactly like a save that did, and the only way to find out is to
 * reload and notice the change is gone. Naming a face in the review lightbox
 * did nothing at all for weeks for precisely this reason.
 *
 * So rather than chase several dozen call sites, this wraps `fetch` once and
 * reports anything addressed to /api that comes back bad. Call sites keep
 * their own handling; this only ensures the failure is never silent.
 *
 * Installed once, at module load, before React mounts. `MeContext` also wraps
 * `window.fetch` — for the "view as" preview header — and restores the
 * previous one when the preview ends, so it has to wrap this rather than the
 * other way round. Installing from inside a component would put the two in a
 * fight over whose fetch gets restored.
 */

// Requests that fail as a matter of course. `/api/admin/me` is the identity
// probe: for anybody who is not an admin, a refusal is the correct answer and
// not news.
const QUIET = [/^\/api\/admin\/me\b/]

// What each corner of the API is called in a sentence. Keyed on the first
// segment after /api, which is how the routers are organised.
const AREAS = {
  people: 'people', faces: 'that face', gallery: 'that photograph',
  media: 'that photograph', albums: 'albums', collections: 'scrapbooks',
  groups: 'groups', suggestions: 'suggestions', search: 'search',
  upload: 'the upload', admin: 'admin data', jobs: 'jobs', places: 'places',
}

const listeners = new Set()

/** Be told about API failures. Returns the unsubscribe. */
export function onApiError(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function pathOf(input) {
  const raw = typeof input === 'string' ? input : (input?.url || '')
  // An absolute URL still has to be matched on its path.
  return raw.startsWith('http') ? (raw.split(/https?:\/\/[^/]+/)[1] || '') : raw
}

function reasonFor(status) {
  if (status === 404) return 'not found'
  if (status === 409) return 'it conflicts with something already there'
  if (status >= 500) return 'server error'
  return 'the server refused it'
}

/** A plain sentence saying what failed. */
export function describeApiFailure({ path = '', method = 'GET', status = 0 }) {
  const area = AREAS[path.replace(/^\/api\//, '').split(/[/?]/)[0]] || 'that'
  if (!status) return `Couldn't reach the server — ${area} did not load.`
  const verb = /^(GET|HEAD)$/i.test(method) ? 'load' : 'save'
  return `Couldn't ${verb} ${area} — ${reasonFor(status)} (${status}).`
}

/**
 * Wrap `fetch` so failures reach the listeners. Idempotent: wrapping twice
 * would report every failure twice.
 *
 * `win` and `now` are injectable for the tests, which otherwise could not
 * drive the dedupe window without faking global time.
 */
export function installApiErrorReporter(win = globalThis, now = () => Date.now()) {
  if (!win?.fetch || win.__apiErrorReporter) return () => {}
  const original = win.fetch
  // The same failure usually arrives several times at once — a page opening
  // eight panels against a server that is down. One sentence is the news.
  const seen = new Map()
  const WINDOW = 4000

  const report = detail => {
    if (QUIET.some(re => re.test(detail.path))) return
    const message = describeApiFailure(detail)
    const t = now()
    const last = seen.get(message)
    if (last != null && t - last < WINDOW) return
    seen.set(message, t)
    for (const fn of listeners) {
      try {
        fn(message, detail)
      } catch {
        // A broken listener is not a reason to break the request.
      }
    }
  }

  win.__apiErrorReporter = true
  win.fetch = async (input, init = {}) => {
    const path = pathOf(input)
    if (!path.startsWith('/api')) return original(input, init)
    const method = (init?.method || (typeof input !== 'string' && input?.method) || 'GET')
    try {
      const res = await original(input, init)
      if (!res.ok) report({ path, method, status: res.status })
      return res
    } catch (e) {
      // Navigating away cancels in-flight requests. That is not a failure,
      // and saying so on every page change would be constant noise.
      if (e?.name !== 'AbortError') report({ path, method, status: 0 })
      throw e
    }
  }

  return () => {
    win.fetch = original
    delete win.__apiErrorReporter
  }
}
