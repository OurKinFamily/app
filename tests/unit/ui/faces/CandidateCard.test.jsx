import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CandidateCard } from '../../../../src/ui/faces/CandidateCard'

/**
 * "Faces that go together, but nobody named" — several clusters that resemble
 * each other more than they resemble anyone named.
 *
 * The card asks one question: who is this? Which it cannot ask without
 * showing the faces.
 */

function cluster(id, n, crops) {
  return {
    cluster_id: id,
    n_faces: n,
    samples: crops.map(c => ({ crop_url: c, photo_path: `archive/2019/01/${c}` })),
  }
}

// The crops carry alt="" — they are the content, not a description of it —
// so they have no `img` role and must be queried from the DOM.
const crops = c => [...c.querySelectorAll('img')].map(i => i.getAttribute('src'))

function renderCard(candidate, props = {}) {
  return render(
    <CandidateCard
      candidate={candidate}
      onCreate={vi.fn()}
      onAssign={vi.fn()}
      onPark={vi.fn()}
      onSkip={vi.fn()}
      onDismiss={vi.fn()}
      onInspect={vi.fn()}
      onOpenPhoto={vi.fn()}
      busy={false}
      {...props}
    />,
  )
}

describe('CandidateCard', () => {
  describe('the faces it is asking about', () => {
    it('shows the crops from every cluster in the candidate', () => {
      // regression(2026-11-24): the card read `candidate.samples`, which the
      // api never sends — the crops hang off each cluster. The whole section
      // rendered counts and no faces, so there was nothing to identify.
      renderCard({
        candidate_id: 'uc:a,b',
        n_faces: 24,
        clusters: [cluster('a', 14, ['a0.jpg', 'a1.jpg']), cluster('b', 10, ['b0.jpg'])],
      })
      expect(crops(document.body)).toEqual(
        expect.arrayContaining(['a0.jpg', 'a1.jpg', 'b0.jpg']))
    })

    it('still works when the api sends them on the candidate itself', () => {
      renderCard({
        candidate_id: 'uc:a',
        n_faces: 2,
        samples: [{ crop_url: 'top.jpg' }],
        clusters: [cluster('a', 2, ['nested.jpg'])],
      })
      expect(crops(document.body)).toContain('top.jpg')
    })

    it('renders nothing rather than breaking when there are no crops', () => {
      renderCard({ candidate_id: 'uc:a', n_faces: 3, clusters: [] })
      expect(crops(document.body)).toHaveLength(0)
    })

    it('survives a candidate with no clusters key at all', () => {
      renderCard({ candidate_id: 'uc:a', n_faces: 3 })
      expect(screen.getByText(/Somebody unnamed/)).toBeInTheDocument()
    })
  })

  describe('when there are more crops than fit', () => {
    const many = {
      candidate_id: 'uc:big',
      n_faces: 300,
      clusters: [cluster('a', 300, Array.from({ length: 30 }, (_, i) => `f${i}.jpg`))],
    }

    it('caps the strip and offers the rest', () => {
      renderCard(many)
      expect(crops(document.body)).toHaveLength(24)
      expect(screen.getByText(/Show 6 more/)).toBeInTheDocument()
    })

    it('shows them all once asked', () => {
      renderCard(many)
      fireEvent.click(screen.getByText(/Show 6 more/))
      expect(crops(document.body)).toHaveLength(30)
    })
  })

  describe('the header', () => {
    it('counts the faces, not the crops on screen', () => {
      renderCard({
        candidate_id: 'uc:a',
        n_faces: 2946,
        clusters: [cluster('a', 2000, ['a.jpg']), cluster('b', 946, ['b.jpg'])],
      })
      expect(screen.getByText(/2,946 faces/)).toBeInTheDocument()
    })

    it('mentions the groups only when there is more than one', () => {
      renderCard({ candidate_id: 'uc:a', n_faces: 9, clusters: [cluster('a', 9, ['a.jpg'])] })
      expect(screen.queryByText(/groups/)).toBeNull()
    })
  })
})
