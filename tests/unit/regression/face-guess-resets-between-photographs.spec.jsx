import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FaceGuess } from '../../../src/ui/FaceGuess'

const guess = (idx, pid, name, score = 0.6, crop = '/c.jpg') => ({
  face_index: idx,
  crop_url: crop,
  suggestion: { person_id: pid, name, score },
})

function ask(props = {}) {
  const onConfirm = vi.fn()
  const onReject = vi.fn()
  const view = render(
    <FaceGuess
      path="archive/2026/11/a.jpg"
      guesses={[guess(0, 't', 'Tristan Delloue')]}
      onConfirm={onConfirm}
      onReject={onReject}
      {...props}
    />,
  )
  return { ...view, onConfirm, onReject }
}

describe('asking who an unnamed face is', () => {
  it('asks the question', () => {
    ask()
    expect(screen.getByText(/Is this/)).toBeInTheDocument()
    expect(screen.getByText('Tristan Delloue')).toBeInTheDocument()
    expect(screen.getByText(/60% alike/)).toBeInTheDocument()
  })

  it('says how many frames of a video it covers', () => {
    ask({ guesses: [guess(0, 'g', 'Guillaume'), guess(4, 'g', 'Guillaume', 0.45)] })
    expect(screen.getByText(/2 frames/)).toBeInTheDocument()
  })

  it('does not count frames when there is only one', () => {
    ask()
    expect(screen.queryByText(/frames/)).not.toBeInTheDocument()
  })

  it('claims every frame of that person on yes', async () => {
    const { onConfirm } = ask({
      guesses: [guess(2, 'g', 'Guillaume'), guess(5, 'g', 'Guillaume')],
    })
    fireEvent.click(screen.getByLabelText('Yes, this is Guillaume'))
    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    expect(onConfirm.mock.calls[0][0].face_indexes).toEqual([2, 5])
    expect(onConfirm.mock.calls[0][1]).toBe('g')
  })

  it('records a rejection on no', async () => {
    const { onReject } = ask()
    fireEvent.click(screen.getByLabelText('No, that is not Tristan Delloue'))
    await waitFor(() => expect(onReject).toHaveBeenCalled())
    expect(onReject.mock.calls[0][1]).toBe('t')
  })

  it('drops the question once answered', async () => {
    ask()
    fireEvent.click(screen.getByLabelText('Yes, this is Tristan Delloue'))
    await waitFor(() => expect(screen.queryByText(/Is this/)).not.toBeInTheDocument())
  })

  it('asks nothing when no face has a confident answer', () => {
    const { container } = ask({ guesses: [{ face_index: 0, crop_url: '/c.jpg' }] })
    expect(container).toBeEmptyDOMElement()
  })

  it('asks nothing when there are no unnamed faces', () => {
    const { container } = ask({ guesses: [] })
    expect(container).toBeEmptyDOMElement()
  })

  describe('paging to the next photograph', () => {
    it('asks again about the same person', async () => {
      // regression(2026-11-13): the answered-set was not scoped to the
      // photograph, and this component stays mounted while you page through
      // with the chevrons. Saying yes to Tristan here suppressed the question
      // about Tristan on the next photograph — and it reappeared on a browser
      // refresh, which remounts and empties the set, so it looked arbitrary.
      const { rerender } = ask()
      fireEvent.click(screen.getByLabelText('Yes, this is Tristan Delloue'))
      await waitFor(() => expect(screen.queryByText(/Is this/)).not.toBeInTheDocument())

      rerender(
        <FaceGuess
          path="archive/2026/11/b.jpg"
          guesses={[guess(0, 't', 'Tristan Delloue')]}
          onConfirm={vi.fn()}
          onReject={vi.fn()}
        />,
      )
      expect(screen.getByText('Tristan Delloue')).toBeInTheDocument()
    })

    it('does not drag an answer forward once you answer on the new photograph', async () => {
      // The subtler half. Answering on photograph B must build its set from
      // B's answers, not from A's — otherwise saying yes to Guillaume here
      // silently buries the still-unanswered question about Tristan.
      const { rerender } = ask()
      fireEvent.click(screen.getByLabelText('Yes, this is Tristan Delloue'))
      await waitFor(() => expect(screen.queryByText(/Is this/)).not.toBeInTheDocument())

      const both = [guess(0, 't', 'Tristan Delloue'), guess(1, 'g', 'Guillaume')]
      rerender(
        <FaceGuess path="archive/2026/11/b.jpg" guesses={both}
          onConfirm={vi.fn()} onReject={vi.fn()} />,
      )
      fireEvent.click(screen.getByLabelText('Yes, this is Guillaume'))
      await waitFor(() =>
        expect(screen.queryByText('Guillaume')).not.toBeInTheDocument())
      expect(screen.getByText('Tristan Delloue')).toBeInTheDocument()
    })

    it('still remembers an answer about the photograph you are on', async () => {
      const { rerender } = ask({
        guesses: [guess(0, 't', 'Tristan Delloue'), guess(1, 'g', 'Guillaume')],
      })
      fireEvent.click(screen.getByLabelText('Yes, this is Tristan Delloue'))
      await waitFor(() =>
        expect(screen.queryByText('Tristan Delloue')).not.toBeInTheDocument())

      // A re-render of the same photograph — the panel refetches after an
      // assignment — must not bring the answered question back.
      rerender(
        <FaceGuess
          path="archive/2026/11/a.jpg"
          guesses={[guess(0, 't', 'Tristan Delloue'), guess(1, 'g', 'Guillaume')]}
          onConfirm={vi.fn()}
          onReject={vi.fn()}
        />,
      )
      expect(screen.queryByText('Tristan Delloue')).not.toBeInTheDocument()
      expect(screen.getByText('Guillaume')).toBeInTheDocument()
    })
  })
})
