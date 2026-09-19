import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

/**
 * The companion to the broken-toast case: no toast at all.
 *
 * The context hands back `{ toast }`, so anything rendering this hook outside
 * a ToastProvider — a test, a stray mount, a page built in a hurry — gets
 * nothing to report with. A failure must still finish quietly rather than
 * throwing on the way to complaining.
 */
vi.mock('../../../src/components/Toast', () => ({ useToast: () => ({}) }))

const { useFaceReview } = await import('../../../src/lib/useFaceReview')

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

beforeEach(() => {
  global.fetch = vi.fn(url => {
    const s = String(url)
    if (s.includes('/unassigned/count')) return ok({ remaining: 0 })
    if (s.includes('/unassigned/leftover')) return ok({ leftover: [], total: 0 })
    if (s.includes('/unassigned/grouped')) return ok({ groups: [], ambiguous: [], unknown_candidates: [] })
    return Promise.reject(new Error('nothing doing'))
  })
})

describe('with no way to report anything', () => {
  it('finishes the action quietly', async () => {
    const { result } = renderHook(() => useFaceReview())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(
        result.current.confirmGroup(
          { person_id: 'p1', person_name: 'Margaret' },
          [{ cluster_id: 'c1', n_faces: 2 }],
        ),
      ).resolves.toBeNull()
    })

    expect(result.current.busy).toBe(false)
  })
})
