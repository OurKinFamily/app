import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../../src/components/Toast'

const group = {
  person_id: 'p1', person_name: 'Aunt Ada', person_n_total: 10,
  n_faces: 59, avg_similarity: 0.9,
  clusters: [{ cluster_id: 'c1', n_faces: 59, samples: [{ crop_url: '/a.jpg', photo_path: 'archive/a.jpg' }] }],
}

vi.mock('../../../src/lib/api', () => ({
  assignClustersBulk: vi.fn(() => Promise.resolve({ assigned: 59 })),
  assignCluster: vi.fn(() => Promise.resolve({})),
  createPerson: vi.fn(() => Promise.resolve({ id: 'new' })),
  skipCluster: vi.fn(() => Promise.resolve({})),
  searchPeople: vi.fn(() => Promise.resolve([])),
  getGroupedSuggestions: vi.fn(() => Promise.resolve({ groups: [group], ambiguous: [], unknown_candidates: [] })),
  getLeftoverClusters: vi.fn(() => Promise.resolve({ leftover: [], total: 0 })),
}))

import { FaceSuggestions } from '../../../src/pages/FaceSuggestions'

/**
 * Regression: confirming a suggestion assigned the faces and then left the card
 * on screen, in all three review flows.
 *
 * The toast context hands back { toast }, not the toast. Reading it whole made
 * every toast.success a TypeError — thrown AFTER the assign had succeeded and
 * before the card was hidden — and the catch then threw again on toast.error.
 * So the work landed, nothing was reported, and the screen never moved.
 *
 * Mocking the toast hid it, which is why the first three tests passed. This one
 * uses the real provider.
 */
describe('with the real toast provider', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ remaining: 1 }) }))
  })

  it('removes the card after confirming', async () => {
    render(
      <MemoryRouter><ToastProvider><FaceSuggestions /></ToastProvider></MemoryRouter>,
    )
    await screen.findByText('Aunt Ada')
    fireEvent.click(screen.getByText(/Confirm/))
    await waitFor(() => expect(screen.queryByText('Aunt Ada')).toBeNull(), { timeout: 2000 })
  })
})
