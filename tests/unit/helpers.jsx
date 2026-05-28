import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'

// Shared helpers for unit tests. Pulled out so each test file doesn't
// re-invent router wrapping or fetch-mocking.

// ---------------------------------------------------------------------------
// renderWithRouter — wraps `ui` in MemoryRouter for anything that uses
// useNavigate / useLocation / useParams. Pass `route` to seed the URL; pass
// `path` if the component needs to match a route pattern (e.g. `/people/:id`).
//
//   renderWithRouter(<PersonPage />, { route: '/people/abc', path: '/people/:id' })
export function renderWithRouter(ui, { route = '/', path } = {}) {
  if (path) {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    )
  }
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>)
}

// ---------------------------------------------------------------------------
// mockFetch — installs a fetch mock that returns `data` for any call. Use
// when the test only cares about the single roundtrip.
//
//   mockFetch([{ id: 1 }])
export function mockFetch(data, { ok = true, status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json:  async () => data,
    text:  async () => JSON.stringify(data),
  })
  global.fetch = fn
  return fn
}

// ---------------------------------------------------------------------------
// mockFetchSequence — returns the responses in order. Each call to fetch
// pops the next entry. Throws if more calls happen than responses queued.
//
//   mockFetchSequence([
//     { data: [1, 2, 3] },
//     { data: [],        ok: false, status: 500 },
//   ])
export function mockFetchSequence(responses) {
  let i = 0
  const fn = vi.fn().mockImplementation(() => {
    if (i >= responses.length) {
      throw new Error(`fetch called more times (${i + 1}) than queued responses (${responses.length})`)
    }
    const { data, ok = true, status = 200 } = responses[i++]
    return Promise.resolve({
      ok,
      status,
      json:  async () => data,
      text:  async () => JSON.stringify(data),
    })
  })
  global.fetch = fn
  return fn
}

// ---------------------------------------------------------------------------
// mockFetchFail — every call rejects with the given Error (or a default).
export function mockFetchFail(error = new Error('network')) {
  const fn = vi.fn().mockRejectedValue(error)
  global.fetch = fn
  return fn
}
