import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../../src/components/Toast'
import { useClusterAssign } from '../../../src/lib/useClusterAssign'

/**
 * Regression: naming a group twice in the same instant took the faces out of
 * the queue twice.
 *
 * The guard read `saving`, which is state and so only visible to the next
 * render. Two calls in one tick — a double-click, or Enter held down — both
 * saw false, both sent the same faces to the server, and both told the queue
 * that a full batch had been taken. A group of ten reported twenty.
 */
const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>
const faces = n => Array.from({ length: n }, (_, i) => ({
  photo_path: `archive/2026/${i}.jpg`, face_index: i,
}))
const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

beforeEach(() => {
  global.fetch = vi.fn(url => (
    String(url).includes('/assign') ? ok({}) : ok({ id: 'c1', size: 10, faces: faces(10) })
  ))
})

describe('naming a group twice at once', () => {
  it('counts the faces once', async () => {
    const onAssigned = vi.fn()
    const { result } = renderHook(
      () => useClusterAssign({ id: 'c1', size: 10 }, { onAssigned, onSkipped: vi.fn() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.detail).toBeTruthy())

    await act(async () => {
      await Promise.all([
        result.current.assign('p1', 'Margaret'),
        result.current.assign('p1', 'Margaret'),
      ])
    })

    expect(onAssigned.mock.calls).toEqual([['c1', 10]])
  })

  it('sends them once', async () => {
    const { result } = renderHook(
      () => useClusterAssign({ id: 'c1', size: 10 }, { onAssigned: vi.fn(), onSkipped: vi.fn() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.detail).toBeTruthy())

    await act(async () => {
      await Promise.all([
        result.current.assign('p1', 'Margaret'),
        result.current.assign('p1', 'Margaret'),
      ])
    })

    const assigns = global.fetch.mock.calls.filter(([u]) => String(u).includes('/assign'))
    expect(assigns).toHaveLength(1)
  })
})
