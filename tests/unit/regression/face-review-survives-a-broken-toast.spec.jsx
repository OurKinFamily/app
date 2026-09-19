import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

/**
 * Regression: a failing action left the screen blank instead of saying what
 * went wrong.
 *
 * The toast is the last thing to run when something fails, and for a while it
 * threw on every call — the context hands back `{ toast }`, and reading it
 * whole made every `toast.success` a TypeError. That turned the reporting of
 * a failure into a second, unhandled failure, which took the page down.
 *
 * The toast is mocked here rather than driven through the provider because
 * the hazard being tested IS a broken toast: there is no way to ask the real
 * one to misbehave, and the guard exists precisely for the day it does.
 */
vi.mock('../../../src/components/Toast', () => ({
  useToast: () => ({
    toast: {
      success: () => { throw new TypeError('toast is not a function') },
      error: () => { throw new TypeError('toast is not a function') },
      info: () => { throw new TypeError('toast is not a function') },
    },
  }),
}))

const { useFaceReview } = await import('../../../src/lib/useFaceReview')

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
const GROUP = { person_id: 'p1', person_name: 'Margaret' }
const CLUSTERS = [{ cluster_id: 'c1', n_faces: 12 }]

beforeEach(() => {
  global.fetch = vi.fn(url => {
    const s = String(url)
    if (s.includes('/unassigned/count')) return ok({ remaining: 3 })
    if (s.includes('/unassigned/leftover')) return ok({ leftover: [], total: 0 })
    if (s.includes('/unassigned/grouped')) return ok({ groups: [], ambiguous: [], unknown_candidates: [] })
    return Promise.reject(new Error('the pool is exhausted'))
  })
})

describe('when the toast itself is broken', () => {
  it('still finishes, and still says it is no longer busy', async () => {
    const { result } = renderHook(() => useFaceReview())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.confirmGroup(GROUP, CLUSTERS)).resolves.toBeNull()
    })

    expect(result.current.busy).toBe(false)
    // The card stays, because nothing was confirmed.
    expect(result.current.hidden.has('p1')).toBe(false)
  })
})
