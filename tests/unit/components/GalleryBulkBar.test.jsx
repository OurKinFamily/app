import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// LocationPicker pulls the place-shortcut + geocode APIs; stub it to a simple
// controllable input so these tests focus on the bulk bar + apply wiring.
vi.mock('../../../src/components/LocationPicker', () => ({
  parseLatLng: (lat, lng) => {
    const a = parseFloat(lat), b = parseFloat(lng)
    return Number.isFinite(a) && Number.isFinite(b) ? { lat: a, lng: b } : null
  },
  LocationPicker: ({ onChange }) => (
    <>
      <button type="button" onClick={() => onChange({ latStr: '42', lngStr: '-71', place: 'Town' })}>
        mock-pick
      </button>
      <button type="button" onClick={() => onChange({ latStr: '42', lngStr: '-71', place: '' })}>
        mock-pick-noplace
      </button>
    </>
  ),
}))

vi.mock('../../../src/lib/api', () => ({
  bulkSetLocation: vi.fn(),
  bulkRedateMedia: vi.fn(),
}))
import { bulkSetLocation, bulkRedateMedia } from '../../../src/lib/api'
import { GalleryBulkBar } from '../../../src/components/GalleryBulkBar'

function renderBar(props = {}) {
  return render(
    <GalleryBulkBar selectedPaths={['a.jpg', 'b.jpg']} onClear={vi.fn()} onDone={vi.fn()} {...props} />
  )
}

describe('GalleryBulkBar', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders nothing when there is no selection', () => {
    const { container } = render(<GalleryBulkBar selectedPaths={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the selected count', () => {
    renderBar()
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('clear button calls onClear', () => {
    const onClear = vi.fn()
    renderBar({ onClear })
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(onClear).toHaveBeenCalled()
  })

  describe('bulk location', () => {
    it('applies one location to all selected and reports done', async () => {
      bulkSetLocation.mockResolvedValue({ updated: 2 })
      const onClear = vi.fn(); const onDone = vi.fn()
      renderBar({ onClear, onDone })
      fireEvent.click(screen.getByRole('button', { name: /Location/ }))
      fireEvent.click(screen.getByRole('button', { name: 'mock-pick' }))  // sets a valid draft
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      await waitFor(() => expect(bulkSetLocation).toHaveBeenCalledWith(
        ['a.jpg', 'b.jpg'], { latitude: 42, longitude: -71, place_name: 'Town' },
      ))
      await waitFor(() => expect(onDone).toHaveBeenCalledWith(2))
      expect(onClear).toHaveBeenCalled()
    })

    it('rejects an empty/invalid draft without calling the API', () => {
      renderBar()
      fireEvent.click(screen.getByRole('button', { name: /Location/ }))
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      expect(bulkSetLocation).not.toHaveBeenCalled()
      expect(screen.getByText('Enter valid lat, lng')).toBeInTheDocument()
    })

    it('surfaces an API error', async () => {
      bulkSetLocation.mockRejectedValue(new Error('boom'))
      renderBar()
      fireEvent.click(screen.getByRole('button', { name: /Location/ }))
      fireEvent.click(screen.getByRole('button', { name: 'mock-pick' }))
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
    })

    it('sends place_name null when no place was chosen', async () => {
      bulkSetLocation.mockResolvedValue({ updated: 2 })
      renderBar()
      fireEvent.click(screen.getByRole('button', { name: /Location/ }))
      fireEvent.click(screen.getByRole('button', { name: 'mock-pick-noplace' }))
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      await waitFor(() => expect(bulkSetLocation).toHaveBeenCalledWith(
        ['a.jpg', 'b.jpg'], { latitude: 42, longitude: -71, place_name: null },
      ))
    })

    it('falls back to a generic error when the error has no message', async () => {
      bulkSetLocation.mockRejectedValue(new Error(''))
      renderBar()
      fireEvent.click(screen.getByRole('button', { name: /Location/ }))
      fireEvent.click(screen.getByRole('button', { name: 'mock-pick' }))
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument())
    })

    it('falls back to paths.length when the response omits updated', async () => {
      bulkSetLocation.mockResolvedValue({})
      const onDone = vi.fn()
      renderBar({ onDone })
      fireEvent.click(screen.getByRole('button', { name: /Location/ }))
      fireEvent.click(screen.getByRole('button', { name: 'mock-pick' }))
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      await waitFor(() => expect(onDone).toHaveBeenCalledWith(2))
    })
  })

  describe('bulk date', () => {
    it('applies a day-precision date to all selected', async () => {
      bulkRedateMedia.mockResolvedValue({ updated: 2 })
      const onDone = vi.fn()
      renderBar({ onDone })
      fireEvent.click(screen.getByRole('button', { name: /Date/ }))
      fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2010-05-04' } })
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      await waitFor(() => expect(bulkRedateMedia).toHaveBeenCalledWith(
        ['a.jpg', 'b.jpg'], { timestamp: '2010-05-04T12:00:00', precision: 'day' },
      ))
      await waitFor(() => expect(onDone).toHaveBeenCalledWith(2))
    })

    it('supports year precision mode', async () => {
      bulkRedateMedia.mockResolvedValue({ updated: 2 })
      renderBar()
      fireEvent.click(screen.getByRole('button', { name: /Date/ }))
      fireEvent.click(screen.getByRole('button', { name: 'year' }))
      fireEvent.change(document.querySelector('input[type="number"]'), { target: { value: '1999' } })
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      await waitFor(() => expect(bulkRedateMedia).toHaveBeenCalledWith(
        ['a.jpg', 'b.jpg'], { timestamp: '1999-01-01T12:00:00', precision: 'year' },
      ))
    })

    it('supports month precision mode', async () => {
      bulkRedateMedia.mockResolvedValue({ updated: 2 })
      renderBar()
      fireEvent.click(screen.getByRole('button', { name: /Date/ }))
      fireEvent.click(screen.getByRole('button', { name: 'month' }))
      fireEvent.change(document.querySelector('input[type="month"]'), { target: { value: '1999-07' } })
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      await waitFor(() => expect(bulkRedateMedia).toHaveBeenCalledWith(
        ['a.jpg', 'b.jpg'], { timestamp: '1999-07-01T12:00:00', precision: 'month' },
      ))
    })

    it('falls back to a generic error when the error has no message', async () => {
      bulkRedateMedia.mockRejectedValue(new Error(''))
      renderBar()
      fireEvent.click(screen.getByRole('button', { name: /Date/ }))
      fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2010-05-04' } })
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument())
    })

    it('rejects an empty date without calling the API', () => {
      renderBar()
      fireEvent.click(screen.getByRole('button', { name: /Date/ }))
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      expect(bulkRedateMedia).not.toHaveBeenCalled()
      expect(screen.getByText('Pick a date')).toBeInTheDocument()
    })

    it('surfaces an API error', async () => {
      bulkRedateMedia.mockRejectedValue(new Error('nope'))
      renderBar()
      fireEvent.click(screen.getByRole('button', { name: /Date/ }))
      fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2010-05-04' } })
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      await waitFor(() => expect(screen.getByText('nope')).toBeInTheDocument())
    })

    it('falls back to paths.length when the response omits updated', async () => {
      bulkRedateMedia.mockResolvedValue({})
      const onDone = vi.fn()
      renderBar({ onDone })
      fireEvent.click(screen.getByRole('button', { name: /Date/ }))
      fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2010-05-04' } })
      fireEvent.click(screen.getByRole('button', { name: /Apply to 2/ }))
      await waitFor(() => expect(onDone).toHaveBeenCalledWith(2))
    })
  })
})
