import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ToastProvider } from '../../../src/components/Toast'
import { ApiErrorToasts } from '../../../src/components/ApiErrorToasts'
import { installApiErrorReporter } from '../../../src/lib/apiErrors'

/**
 * The reporter wraps `fetch` at module load, before React exists and with no
 * way to reach a context. This is the piece inside the provider that listens
 * on its behalf and turns what it hears into a toast.
 */
describe('ApiErrorToasts', () => {
  let off = () => {}
  afterEach(() => off())

  function setup(win) {
    off = installApiErrorReporter(win, () => 0)
    render(
      <ToastProvider>
        <ApiErrorToasts />
      </ToastProvider>,
    )
  }

  it('shows a toast when an API request fails', async () => {
    const win = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 500 })) }
    setup(win)
    await act(async () => { await win.fetch('/api/albums') })
    expect(await screen.findByText("Couldn't load albums — server error (500).")).toBeInTheDocument()
  })

  it('shows nothing while requests are succeeding', async () => {
    const win = { fetch: vi.fn(() => Promise.resolve({ ok: true, status: 200 })) }
    setup(win)
    await act(async () => { await win.fetch('/api/albums') })
    expect(screen.queryByText(/Couldn't/)).not.toBeInTheDocument()
  })

  it('leaves an error up long enough to read', async () => {
    // Reported as "I keep seeing 'couldn't load people', the toast goes away
    // quickly". Three seconds — the default, which suits a save confirmation —
    // is not long enough for a sentence naming something you have not been
    // told about yet, and a warning nobody can read is not a warning.
    vi.useFakeTimers()
    try {
      const win = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 500 })) }
      setup(win)
      await act(async () => { await win.fetch('/api/people') })
      expect(screen.getByText(/Couldn't load people/)).toBeInTheDocument()

      act(() => { vi.advanceTimersByTime(3500) })
      expect(screen.getByText(/Couldn't load people/)).toBeInTheDocument()

      act(() => { vi.advanceTimersByTime(6000) })
      expect(screen.queryByText(/Couldn't load people/)).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders nothing of its own', () => {
    const win = { fetch: vi.fn() }
    off = installApiErrorReporter(win, () => 0)
    const { container } = render(
      <ToastProvider><ApiErrorToasts /></ToastProvider>,
    )
    // The provider's own live region is all that should be in there.
    expect(container.querySelectorAll('[role="region"]')).toHaveLength(1)
  })
})
