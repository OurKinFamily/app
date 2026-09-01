import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CollectionStory } from '../../../src/components/CollectionStory'

const SHORT = 'A short note about the collection.'
// Over the 600-character collapse threshold.
const LONG = 'The story of this year. '.repeat(30)

function renderStory(props = {}) {
  const onSave = props.onSave ?? vi.fn().mockResolvedValue(true)
  const utils = render(
    <CollectionStory
      story={'story' in props ? props.story : SHORT}
      canEdit={props.canEdit ?? false}
      onSave={onSave}
    />,
  )
  return { ...utils, onSave }
}

describe('CollectionStory', () => {
  describe('with a story', () => {
    it('renders the text', () => {
      renderStory({ story: SHORT })
      expect(screen.getByText(SHORT)).toBeInTheDocument()
    })

    it('renders markdown as markup rather than literal characters', () => {
      renderStory({ story: '# A Heading' })
      expect(screen.getByRole('heading', { name: 'A Heading' })).toBeInTheDocument()
    })

    it('offers no edit control to a family viewer', () => {
      renderStory({ canEdit: false })
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    })

    it('offers an edit control to the owner', () => {
      renderStory({ canEdit: true })
      expect(screen.getByRole('button', { name: /edit collection story/i })).toBeInTheDocument()
    })
  })

  describe('when the story is short', () => {
    it('does not offer to expand', () => {
      renderStory({ story: SHORT })
      expect(screen.queryByRole('button', { name: /read more/i })).not.toBeInTheDocument()
    })
  })

  describe('when the story is long', () => {
    it('offers to expand, so it does not bury the collection contents', () => {
      renderStory({ story: LONG })
      expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument()
    })

    it('toggles between expanded and collapsed', async () => {
      renderStory({ story: LONG })

      fireEvent.click(screen.getByRole('button', { name: /read more/i }))
      expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /show less/i }))
      expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument()
    })
  })

  describe('with no story yet', () => {
    it('shows nothing at all to a family viewer', () => {
      const { container } = renderStory({ story: null, canEdit: false })
      expect(container).toBeEmptyDOMElement()
    })

    it('invites the owner to write one', () => {
      renderStory({ story: null, canEdit: true })
      expect(screen.getByRole('button', { name: /write about this collection/i })).toBeInTheDocument()
    })
  })

  describe('editing', () => {
    it('opens a textarea seeded with the current story', async () => {
      renderStory({ story: SHORT, canEdit: true })

      fireEvent.click(screen.getByRole('button', { name: /edit collection story/i }))
      expect(screen.getByRole('textbox', { name: /collection story/i })).toHaveValue(SHORT)
    })

    it('starts empty when there is no story', async () => {
      renderStory({ story: null, canEdit: true })

      fireEvent.click(screen.getByRole('button', { name: /write about this collection/i }))
      expect(screen.getByRole('textbox', { name: /collection story/i })).toHaveValue('')
    })

    it('passes the edited text to onSave', async () => {
      const { onSave } = renderStory({ story: SHORT, canEdit: true })

      fireEvent.click(screen.getByRole('button', { name: /edit collection story/i }))
      const box = screen.getByRole('textbox', { name: /collection story/i })
      fireEvent.change(box, { target: { value: 'Rewritten.' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave).toHaveBeenCalledWith('Rewritten.')
    })

    it('closes the editor once the save succeeds', async () => {
      renderStory({ story: SHORT, canEdit: true })

      fireEvent.click(screen.getByRole('button', { name: /edit collection story/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(screen.queryByRole('textbox', { name: /collection story/i })).not.toBeInTheDocument())
    })

    it('keeps the editor open when the save fails, so the text is not lost', async () => {
      const onSave = vi.fn().mockResolvedValue(false)
      renderStory({ story: SHORT, canEdit: true, onSave })

      fireEvent.click(screen.getByRole('button', { name: /edit collection story/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: /collection story/i })).toBeInTheDocument())
    })

    it('discards the draft on cancel', async () => {
      renderStory({ story: SHORT, canEdit: true })

      fireEvent.click(screen.getByRole('button', { name: /edit collection story/i }))
      fireEvent.change(screen.getByRole('textbox', { name: /collection story/i }),
        { target: { value: SHORT + ' extra' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.getByText(SHORT)).toBeInTheDocument()
    })

    it('reopens with the original text after a cancel', async () => {
      renderStory({ story: SHORT, canEdit: true })

      fireEvent.click(screen.getByRole('button', { name: /edit collection story/i }))
      fireEvent.change(screen.getByRole('textbox', { name: /collection story/i }),
        { target: { value: SHORT + ' extra' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      fireEvent.click(screen.getByRole('button', { name: /edit collection story/i }))

      expect(screen.getByRole('textbox', { name: /collection story/i })).toHaveValue(SHORT)
    })

    it('returns to the invitation when a first draft is cancelled', async () => {
      renderStory({ story: null, canEdit: true })

      fireEvent.click(screen.getByRole('button', { name: /write about this collection/i }))
      fireEvent.change(screen.getByRole('textbox', { name: /collection story/i }),
        { target: { value: 'started typing' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.getByRole('button', { name: /write about this collection/i })).toBeInTheDocument()
    })

    it('re-enables the save button after a failure', async () => {
      const onSave = vi.fn().mockResolvedValue(false)
      renderStory({ story: SHORT, canEdit: true, onSave })

      fireEvent.click(screen.getByRole('button', { name: /edit collection story/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      // Reads "Saving…" while in flight, then reverts.
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled())
    })
  })
})
