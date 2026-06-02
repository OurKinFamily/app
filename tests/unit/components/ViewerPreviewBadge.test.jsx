import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { ViewerPreviewBadge } from '../../../src/components/ViewerPreviewBadge'
import { renderWithRouter } from '../helpers'

// ViewerPreviewBadge uses useMe() from MeContext for admin guard, preview
// state, and the setPreviewPersonId callback.
const mockMe = vi.fn()
vi.mock('../../../src/contexts/MeContext', () => ({
  useMe: () => mockMe(),
}))

// Avatar renders <img> for src-bearing entries and a div-with-initials for
// null-src entries. No need to mock it — the real Avatar is a leaf component.

// mediaUrl just prefixes the path; no network needed.

const CAYCE_ID    = 'e86a4c66-1df8-49ce-aca3-5b0ac64399b2'
const HENRY_ID    = '8bca6cf0-f0fe-4511-b90e-c4af2ba7e6e1'
const AMELIA_ID   = '3c92c2a7-6699-4393-8fc6-8a9b795f6122'
const MARGARET_ID = '011ac7dc-a633-4ab3-80c3-937f1b20865f'
const PATTY_ID    = '3d74152e-793b-4ec7-894a-e35a5404e8a3'

function defaultMe(overrides = {}) {
  return {
    me: { is_admin: true },
    previewPersonId: null,
    previewAsViewer: false,
    setPreviewPersonId: vi.fn(),
    ...overrides,
  }
}

function renderBadge(meOverrides = {}) {
  mockMe.mockReturnValue(defaultMe(meOverrides))
  return renderWithRouter(<ViewerPreviewBadge />)
}

describe('ViewerPreviewBadge', () => {
  beforeEach(() => { mockMe.mockReset() })

  describe('admin guard', () => {
    it('renders nothing when me is null', () => {
      mockMe.mockReturnValue({ me: null, previewPersonId: null, previewAsViewer: false, setPreviewPersonId: vi.fn() })
      const { container } = renderWithRouter(<ViewerPreviewBadge />)
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when me.is_admin is false', () => {
      mockMe.mockReturnValue({ me: { is_admin: false }, previewPersonId: null, previewAsViewer: false, setPreviewPersonId: vi.fn() })
      const { container } = renderWithRouter(<ViewerPreviewBadge />)
      expect(container.firstChild).toBeNull()
    })

    it('renders the picker when me.is_admin is true', () => {
      renderBadge()
      expect(screen.getByText('View as')).toBeInTheDocument()
    })
  })

  describe('person picker', () => {
    it('shows five person buttons (one per VIEWER_PEOPLE entry)', () => {
      renderBadge()
      // Each button has a title attribute set to known_as. Buttons for people
      // with avatar images are accessible by their full name (via img alt);
      // Patty's button (null avatar → initials) is found by title.
      expect(screen.getByTitle('Cayce')).toBeInTheDocument()
      expect(screen.getByTitle('Henry')).toBeInTheDocument()
      expect(screen.getByTitle('Amelia')).toBeInTheDocument()
      expect(screen.getByTitle('Margaret')).toBeInTheDocument()
      expect(screen.getByTitle('Patty')).toBeInTheDocument()
    })

    it('calls setPreviewPersonId with the person id when a picker button is clicked', () => {
      const setPreviewPersonId = vi.fn()
      renderBadge({ setPreviewPersonId })
      fireEvent.click(screen.getByTitle('Cayce'))
      expect(setPreviewPersonId).toHaveBeenCalledWith(CAYCE_ID)
    })

    it('calls setPreviewPersonId(null) when clicking the already-active person', () => {
      // Clicking an active person toggles it off — `previewPersonId === p.id ? null : p.id`.
      const setPreviewPersonId = vi.fn()
      renderBadge({ previewPersonId: HENRY_ID, setPreviewPersonId })
      fireEvent.click(screen.getByTitle('Henry'))
      expect(setPreviewPersonId).toHaveBeenCalledWith(null)
    })

    it('renders an Avatar with null src for Patty (no avatar path)', () => {
      renderBadge()
      // Patty has avatar: null — Avatar falls back to initials div, not <img>.
      // We can confirm no img with alt "Patricia Ann Forrence" is present.
      expect(screen.queryByRole('img', { name: 'Patricia Ann Forrence' })).not.toBeInTheDocument()
    })

    it('renders an <img> for people who have an avatar path', () => {
      renderBadge()
      // Cayce has an avatar path — Avatar renders an <img> with the person's full name as alt.
      expect(screen.getByRole('img', { name: 'Cayce Ward Young' })).toBeInTheDocument()
    })
  })

  describe('no preview active', () => {
    it('does not show the amber "Viewing as" banner', () => {
      renderBadge({ previewAsViewer: false })
      expect(screen.queryByText(/Viewing as/)).not.toBeInTheDocument()
    })

    it('does not show the "Back to me" button', () => {
      renderBadge({ previewAsViewer: false })
      expect(screen.queryByRole('button', { name: 'Back to me' })).not.toBeInTheDocument()
    })
  })

  describe('preview active (previewAsViewer = true)', () => {
    it('shows the amber banner with the active person\'s known_as', () => {
      renderBadge({ previewPersonId: AMELIA_ID, previewAsViewer: true })
      expect(screen.getByText('Viewing as Amelia')).toBeInTheDocument()
    })

    it('shows "Back to me" button that calls setPreviewPersonId(null)', () => {
      const setPreviewPersonId = vi.fn()
      renderBadge({ previewPersonId: MARGARET_ID, previewAsViewer: true, setPreviewPersonId })
      fireEvent.click(screen.getByText('Back to me'))
      expect(setPreviewPersonId).toHaveBeenCalledWith(null)
    })

    it('falls back to "viewer" in the banner when the active id is not in VIEWER_PEOPLE', () => {
      // previewPersonId set to an unknown id — activePerson is undefined, banner shows fallback.
      renderBadge({ previewPersonId: 'unknown-id', previewAsViewer: true })
      expect(screen.getByText('Viewing as viewer')).toBeInTheDocument()
    })

    it('still renders the person picker alongside the banner', () => {
      renderBadge({ previewPersonId: CAYCE_ID, previewAsViewer: true })
      expect(screen.getByText('View as')).toBeInTheDocument()
      expect(screen.getByTitle('Cayce')).toBeInTheDocument()
    })
  })

  describe('picker button toggle logic (all five people)', () => {
    it.each([
      ['Cayce',    CAYCE_ID],
      ['Henry',    HENRY_ID],
      ['Amelia',   AMELIA_ID],
      ['Margaret', MARGARET_ID],
      ['Patty',    PATTY_ID],
    ])('clicking %s passes its id to setPreviewPersonId', (knownAs, id) => {
      const setPreviewPersonId = vi.fn()
      renderBadge({ setPreviewPersonId })
      fireEvent.click(screen.getByTitle(knownAs))
      expect(setPreviewPersonId).toHaveBeenCalledWith(id)
    })
  })
})
