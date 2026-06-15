import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock the Leaflet-backed map — its real impl needs a real canvas which
// jsdom doesn't have, and it's excluded from coverage anyway.
vi.mock('../../../src/components/MiniMap', () => ({
  MiniMap: ({ lat, lng }) => <div data-testid="minimap" data-lat={lat} data-lng={lng} />,
}))

vi.mock('../../../src/lib/api', () => ({
  redateMedia: vi.fn(),
  setMediaLocation: vi.fn(),
  getPlaceShortcuts: vi.fn(),
  geocodePlace: vi.fn(),
}))
import { redateMedia, setMediaLocation, getPlaceShortcuts, geocodePlace } from '../../../src/lib/api'

vi.mock('../../../src/contexts/MeContext', () => ({ useIsAdmin: vi.fn(() => true) }))
import { useIsAdmin } from '../../../src/contexts/MeContext'

import { MediaDetailMeta } from '../../../src/components/MediaDetailMeta'

// Every test runs as admin unless it overrides useIsAdmin for the non-admin case.
beforeEach(() => { useIsAdmin.mockReturnValue(true) })

function renderMeta(sidecar, heritage, extra = {}) {
  return render(<MediaDetailMeta sidecar={sidecar} heritage={heritage} {...extra} />)
}

describe('MediaDetailMeta', () => {
  describe('edit controls are owner-only', () => {
    const DATED = { timestamps: { primary: { timestamp: '2000-04-15T12:00:00', source: 'exif', confidence: 'high' } }, latitude: 42.7, longitude: -71.1 }
    it('shows the date pencil for an admin', () => {
      renderMeta(DATED, null, { path: 'x.jpg' })
      expect(screen.getByLabelText('Edit date')).toBeInTheDocument()
    })
    it('hides the date pencil and location editor for a non-admin', () => {
      useIsAdmin.mockReturnValue(false)
      renderMeta(DATED, null, { path: 'x.jpg' })
      expect(screen.queryByLabelText('Edit date')).not.toBeInTheDocument()
      // the location *editor* is gone, but the read-only Location section stays
      expect(screen.queryByText('Edit location')).not.toBeInTheDocument()
      expect(screen.queryByText('Correct location')).not.toBeInTheDocument()
      expect(screen.queryByText('Set location')).not.toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Location')).toBeInTheDocument()
    })
  })

  describe('Date section', () => {
    it('prefers heritage.content_date over EXIF', () => {
      renderMeta({}, { content_date: '1995-12-25' })
      expect(screen.getByText('1995-12-25')).toBeInTheDocument()
    })
    it('falls back to sidecar timestamps.primary when heritage date is absent', () => {
      renderMeta({ timestamps: { primary: { timestamp: '2024-05-27T00:00:00Z', source: 'exif', confidence: 'high' } } })
      // Date section is present (the exact en-US date string varies subtly
      // between node ICU builds, so assert on a label that's stable).
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('high')).toBeInTheDocument()
      expect(screen.getByText('exif')).toBeInTheDocument()
    })
    it('omits the section when no date at all', () => {
      renderMeta({})
      expect(screen.queryByText('Date')).not.toBeInTheDocument()
    })
    it('renders the explanation line for heritage dates with one', () => {
      renderMeta({}, { content_date: '1995-12-25', content_date_explanation: 'from baby book' })
      expect(screen.getByText('from baby book')).toBeInTheDocument()
    })
    it('omits the Confidence tag when the date has no confidence value', () => {
      renderMeta({ timestamps: { primary: { timestamp: '2024-01-01T00:00:00Z', source: 'filesystem' } } })
      expect(screen.getByText('filesystem')).toBeInTheDocument()
      expect(screen.queryByText('Confidence')).not.toBeInTheDocument()
    })
    it('falls back to "default" tone when confidence is unknown', () => {
      renderMeta({ timestamps: { primary: { timestamp: '2024-01-01T00:00:00Z', source: 's', confidence: 'weird' } } })
      // The tag still renders with the unknown confidence as text.
      expect(screen.getByText('weird')).toBeInTheDocument()
    })
  })

  describe('Location section', () => {
    it('renders the MiniMap when primary lat/lng is set', () => {
      renderMeta({ location: { primary: { latitude: 42.7, longitude: -71.06 } } })
      expect(screen.getByTestId('minimap')).toBeInTheDocument()
    })
    it('renders heritage place_name when set', () => {
      renderMeta({}, { place_name: 'Cottage' })
      expect(screen.getByText('Cottage')).toBeInTheDocument()
    })
    it('renders the city + state when geolocation has high confidence', () => {
      renderMeta({ location: { geolocation: { city: 'Lancaster', state_code: 'PA', confidence: 0.9 } } })
      expect(screen.getByText('Lancaster, PA')).toBeInTheDocument()
    })
    it('renders city without state_code when only city is set', () => {
      renderMeta({ location: { geolocation: { city: 'Lancaster', confidence: 0.9 } } })
      expect(screen.getByText('Lancaster')).toBeInTheDocument()
    })
    it('treats undefined geolocation.confidence as 0 (skips the city)', () => {
      renderMeta({ location: { geolocation: { city: 'Lancaster' } } })
      expect(screen.queryByText('Lancaster')).not.toBeInTheDocument()
    })
    it('renders a landmark with missing distance as 0m', () => {
      renderMeta({
        location: { landmarks: [{ landmark: { name: 'X' }, confidence: 0.95 }] },
      }, { place_name: '_' })
      expect(screen.getByText(/X \(0m\)/)).toBeInTheDocument()
    })
    it('skips low-confidence geolocation cities', () => {
      renderMeta({ location: { geolocation: { city: 'Maybe', confidence: 0.1 } } })
      expect(screen.queryByText('Maybe')).not.toBeInTheDocument()
    })
    it('renders a top landmark when confidence ≥ 0.8', () => {
      renderMeta({
        location: { landmarks: [{ landmark: { name: 'Cottage' }, confidence: 0.95, distance: 12 }] },
      }, { place_name: '_' })
      expect(screen.getByText(/Cottage \(12m\)/)).toBeInTheDocument()
    })
    it('renders GPS lat/lng to 5 decimals', () => {
      renderMeta({ location: { primary: { latitude: 42.776123456, longitude: -71.065432 } } })
      expect(screen.getByText('42.77612, -71.06543')).toBeInTheDocument()
    })
    it('always renders the Location section (so a no-GPS file can be located)', () => {
      // The section now always shows — even with no coordinates — to expose the
      // "Set location" affordance. (Was previously omitted when empty.)
      renderMeta({}, null, { path: 'a.jpg' })
      expect(screen.getByText('Location')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Set location' })).toBeInTheDocument()
    })
  })

  describe('Notes / Description / Poster', () => {
    it('renders heritage context_notes', () => {
      renderMeta({}, { context_notes: 'a memory' })
      expect(screen.getByText('a memory')).toBeInTheDocument()
    })
    it('renders heritage description', () => {
      renderMeta({}, { description: 'caption' })
      expect(screen.getByText('caption')).toBeInTheDocument()
    })
    it('renders heritage poster_label', () => {
      renderMeta({}, { poster_label: 'cover frame' })
      expect(screen.getByText('cover frame')).toBeInTheDocument()
    })
  })

  describe('Transcription', () => {
    it('renders a transcription with a Show more toggle for long text', () => {
      const long = 'x'.repeat(500)
      renderMeta({}, { transcription: long })
      const btn = screen.getByRole('button', { name: 'Show more' })
      expect(btn).toBeInTheDocument()
      fireEvent.click(btn)
      expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument()
    })
    it('omits the toggle for short transcriptions', () => {
      renderMeta({}, { transcription: 'short note' })
      expect(screen.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument()
    })
  })

  describe('Camera + Exposure', () => {
    it('renders the Camera section heading with make + model', () => {
      renderMeta({ camera: { make: 'Canon', model: 'EOS' } })
      expect(screen.getByText('Camera — Canon EOS')).toBeInTheDocument()
    })
    it('renders the Lens field when distinct from the make+model label', () => {
      renderMeta({ camera: { make: 'Canon', model: 'EOS', lens: '50mm f/1.4' } })
      expect(screen.getByText('50mm f/1.4')).toBeInTheDocument()
    })
    it('renders Exposure fields when settings are provided', () => {
      renderMeta({ settings: { iso: 100, aperture: 1.8, shutterSpeed: '1/250', focalLength: '50mm', flash: 'off' } })
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('f/1.8')).toBeInTheDocument()
      expect(screen.getByText('1/250')).toBeInTheDocument()
    })
    it('omits aperture when settings.aperture is null', () => {
      renderMeta({ settings: { iso: 200, shutterSpeed: '1/60' } })
      expect(screen.queryByText(/f\//)).not.toBeInTheDocument()
    })
  })

  describe('File section', () => {
    it('always renders the File section', () => {
      renderMeta({})
      expect(screen.getByText('File')).toBeInTheDocument()
    })
    it('formats sizes ≥ 1MB as MB and smaller as KB', () => {
      const { rerender } = render(<MediaDetailMeta sidecar={{ file: { size: 2_500_000 } }} />)
      expect(screen.getByText('2.5 MB')).toBeInTheDocument()
      rerender(<MediaDetailMeta sidecar={{ file: { size: 800 } }} />)
      expect(screen.getByText('1 KB')).toBeInTheDocument()
    })
    it('renders dimensions + megapixels + format when available', () => {
      renderMeta({ media: { dimensions: { width: 4000, height: 3000, megapixels: 12 }, format: 'jpeg' } })
      expect(screen.getByText('4000 × 3000')).toBeInTheDocument()
      expect(screen.getByText('12 MP')).toBeInTheDocument()
      expect(screen.getByText('jpeg')).toBeInTheDocument()
    })
    it('hides Orientation when it is unknown', () => {
      renderMeta({ media: { dimensions: { width: 100, height: 100, orientation: 'unknown' } } })
      expect(screen.queryByText('Orientation')).not.toBeInTheDocument()
    })
    it('shows Orientation when known', () => {
      renderMeta({ media: { dimensions: { width: 100, height: 100, orientation: 'landscape' } } })
      expect(screen.getByText('landscape')).toBeInTheDocument()
    })
  })

  describe('Colors section', () => {
    it('renders one Swatch per supplied color', () => {
      renderMeta({ media: { dominantColor: '#aaa', meanColor: '#bbb', salientColor: '#ccc' } })
      expect(screen.getByText('Dominant')).toBeInTheDocument()
      expect(screen.getByText('Mean')).toBeInTheDocument()
      expect(screen.getByText('Salient')).toBeInTheDocument()
    })
    it('omits the section when no colors are set', () => {
      renderMeta({})
      expect(screen.queryByText('Colors')).not.toBeInTheDocument()
    })
  })

  describe('Physical original + Provenance + Audio + Processing', () => {
    it('renders the physical_status + condition fields', () => {
      renderMeta({}, { physical_status: 'ARCHIVED', physical_condition: 'good' })
      expect(screen.getByText('ARCHIVED')).toBeInTheDocument()
      expect(screen.getByText('good')).toBeInTheDocument()
    })
    it('renders provenance with a collection link', () => {
      renderMeta({}, { collection_id: 'col-1', page_number: 5 })
      const link = screen.getByRole('link', { name: 'open' })
      expect(link).toHaveAttribute('href', '/manage/collections/col-1')
      expect(screen.getByText('5')).toBeInTheDocument()
    })
    it('renders the audio description', () => {
      renderMeta({}, { audio_description: 'Uncle singing' })
      expect(screen.getByText('Uncle singing')).toBeInTheDocument()
    })
    it('renders Processing when processor is set', () => {
      renderMeta({ processing: { processor: 'mpp@2.0', extractedAt: '2024-01-01T00:00:00Z' } })
      expect(screen.getByText('mpp@2.0')).toBeInTheDocument()
    })
    it('handles missing extractedAt in Processing (formatDate null branch)', () => {
      renderMeta({ processing: { processor: 'mpp@2.0' } })
      expect(screen.getByText('mpp@2.0')).toBeInTheDocument()
    })
  })

  describe('DateEditor', () => {
    const sidecar = {
      timestamps: { primary: { timestamp: '2000-04-15T12:00:00', source: 'exif', confidence: 'high', precision: 'day' } },
    }
    beforeEach(() => { redateMedia.mockReset() })

    it('omits the pencil when no path is provided', () => {
      renderMeta(sidecar, null)
      expect(screen.queryByLabelText('Edit date')).not.toBeInTheDocument()
    })

    it('shows the pencil and opens the editor on click', () => {
      renderMeta(sidecar, null, { path: 'x.jpg' })
      fireEvent.click(screen.getByLabelText('Edit date'))
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'day' })).toBeInTheDocument()
    })

    it('saves a Day-precision change and calls onRedated', async () => {
      redateMedia.mockResolvedValue({})
      const onRedated = vi.fn()
      renderMeta(sidecar, null, { path: 'x.jpg', onRedated })
      fireEvent.click(screen.getByLabelText('Edit date'))
      const input = screen.getByDisplayValue('2000-04-15')
      fireEvent.change(input, { target: { value: '2001-06-20' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(redateMedia).toHaveBeenCalledWith('x.jpg', {
        timestamp: '2001-06-20T12:00:00', precision: 'day',
      }))
      expect(onRedated).toHaveBeenCalled()
    })

    it('switches to Month mode and saves a YYYY-MM value', async () => {
      redateMedia.mockResolvedValue({})
      renderMeta(sidecar, null, { path: 'x.jpg' })
      fireEvent.click(screen.getByLabelText('Edit date'))
      fireEvent.click(screen.getByRole('button', { name: 'month' }))
      const input = screen.getByDisplayValue('2000-04')
      fireEvent.change(input, { target: { value: '1995-12' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(redateMedia).toHaveBeenCalledWith('x.jpg', {
        timestamp: '1995-12-01T12:00:00', precision: 'month',
      }))
    })

    it('switches to Year mode and saves a YYYY value', async () => {
      redateMedia.mockResolvedValue({})
      renderMeta(sidecar, null, { path: 'x.jpg' })
      fireEvent.click(screen.getByLabelText('Edit date'))
      fireEvent.click(screen.getByRole('button', { name: 'year' }))
      const input = screen.getByDisplayValue('2000')
      fireEvent.change(input, { target: { value: '1980' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(redateMedia).toHaveBeenCalledWith('x.jpg', {
        timestamp: '1980-01-01T12:00:00', precision: 'year',
      }))
    })

    it('shows "Pick a date" when the input is empty on save', async () => {
      renderMeta(sidecar, null, { path: 'x.jpg' })
      fireEvent.click(screen.getByLabelText('Edit date'))
      const input = screen.getByDisplayValue('2000-04-15')
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(await screen.findByText('Pick a date')).toBeInTheDocument()
      expect(redateMedia).not.toHaveBeenCalled()
    })

    it('closes silently when the value is unchanged', () => {
      renderMeta(sidecar, null, { path: 'x.jpg' })
      fireEvent.click(screen.getByLabelText('Edit date'))
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(redateMedia).not.toHaveBeenCalled()
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    })

    it('surfaces the API error message', async () => {
      redateMedia.mockRejectedValue(new Error('bad ts'))
      renderMeta(sidecar, null, { path: 'x.jpg' })
      fireEvent.click(screen.getByLabelText('Edit date'))
      const input = screen.getByDisplayValue('2000-04-15')
      fireEvent.change(input, { target: { value: '2001-06-20' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(await screen.findByText('bad ts')).toBeInTheDocument()
    })

    it('falls back to "Save failed" when the error has no message', async () => {
      redateMedia.mockRejectedValue({})
      renderMeta(sidecar, null, { path: 'x.jpg' })
      fireEvent.click(screen.getByLabelText('Edit date'))
      const input = screen.getByDisplayValue('2000-04-15')
      fireEvent.change(input, { target: { value: '2001-06-20' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(await screen.findByText('Save failed')).toBeInTheDocument()
    })

    it('cancels via the Cancel button', () => {
      renderMeta(sidecar, null, { path: 'x.jpg' })
      fireEvent.click(screen.getByLabelText('Edit date'))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    })

    it('commits on Enter and cancels on Escape (and stops propagation)', async () => {
      redateMedia.mockResolvedValue({})
      renderMeta(sidecar, null, { path: 'x.jpg' })
      fireEvent.click(screen.getByLabelText('Edit date'))
      const input = screen.getByDisplayValue('2000-04-15')
      fireEvent.change(input, { target: { value: '2001-06-20' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      await waitFor(() => expect(redateMedia).toHaveBeenCalled())

      // Re-open and cancel with Escape
      fireEvent.click(screen.getByLabelText('Edit date'))
      const input2 = screen.getByDisplayValue('2000-04-15')
      fireEvent.keyDown(input2, { key: 'Escape' })
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    })

    it('ignores keys other than Enter/Escape', () => {
      renderMeta(sidecar, null, { path: 'x.jpg' })
      fireEvent.click(screen.getByLabelText('Edit date'))
      const input = screen.getByDisplayValue('2000-04-15')
      fireEvent.keyDown(input, { key: 'a' })
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('formats a Month-precision value in the read view and edits it', async () => {
      redateMedia.mockResolvedValue({})
      renderMeta(
        { timestamps: { primary: { timestamp: '2000-04-15T12:00:00', source: 'exif', confidence: 'high', precision: 'month' } } },
        null,
        { path: 'x.jpg' }
      )
      expect(screen.getByText(/April 2000/)).toBeInTheDocument()
      fireEvent.click(screen.getByLabelText('Edit date'))
      const input = screen.getByDisplayValue('2000-04')
      fireEvent.change(input, { target: { value: '1995-12' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      // Save exercises valueForEdit(value, 'month') in commit() —
      // covers the month branch of valueForEdit.
      await waitFor(() => expect(redateMedia).toHaveBeenCalledWith('x.jpg', {
        timestamp: '1995-12-01T12:00:00', precision: 'month',
      }))
    })

    it('formats a Year-precision value in the read view and edits it', async () => {
      redateMedia.mockResolvedValue({})
      renderMeta(
        { timestamps: { primary: { timestamp: '2000-04-15T12:00:00', source: 'exif', confidence: 'high', precision: 'year' } } },
        null,
        { path: 'x.jpg' }
      )
      expect(screen.getByText('2000')).toBeInTheDocument()
      fireEvent.click(screen.getByLabelText('Edit date'))
      // Pre-fill should match precision='year' → year input shows 2000.
      // Changing it and saving exercises valueForEdit(value, 'year') in commit().
      const input = screen.getByDisplayValue('2000')
      fireEvent.change(input, { target: { value: '1985' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(redateMedia).toHaveBeenCalledWith('x.jpg', {
        timestamp: '1985-01-01T12:00:00', precision: 'year',
      }))
    })

    it('still shows heritage content_date as the read-view string when present', () => {
      renderMeta(sidecar, { content_date: '1995' }, { path: 'x.jpg' })
      expect(screen.getByText('1995')).toBeInTheDocument()
    })

    it('handles a missing date value gracefully when opening editor', () => {
      // dateValue would be undefined → section omitted entirely; nothing to edit.
      renderMeta({}, null, { path: 'x.jpg' })
      expect(screen.queryByLabelText('Edit date')).not.toBeInTheDocument()
    })
  })

  describe('landmark confidence', () => {
    it('treats a landmark with no confidence as 0 → skipped', () => {
      renderMeta({
        location: { landmarks: [{ landmark: { name: 'X' } }] },
      }, { place_name: '_' })
      expect(screen.queryByText(/X \(/)).not.toBeInTheDocument()
    })
  })

  describe('LocationEditor', () => {
    beforeEach(() => {
      setMediaLocation.mockReset()
      getPlaceShortcuts.mockReset().mockResolvedValue([])
      geocodePlace.mockReset().mockResolvedValue([])
    })

    it('shows "Set location" when there is no GPS', () => {
      renderMeta({}, null, { path: 'archive/x.jpg' })
      expect(screen.getByRole('button', { name: 'Set location' })).toBeInTheDocument()
    })

    it('shows "Edit location" when the source is manual', () => {
      renderMeta({ location: { primary: { latitude: 1, longitude: 2, source: 'manual' } } }, null, { path: 'a.jpg' })
      expect(screen.getByRole('button', { name: 'Edit location' })).toBeInTheDocument()
    })

    it('shows "Correct location" when GPS came from a non-manual source', () => {
      renderMeta({ location: { primary: { latitude: 1, longitude: 2, source: 'exif' } } }, null, { path: 'a.jpg' })
      expect(screen.getByRole('button', { name: 'Correct location' })).toBeInTheDocument()
    })

    it('opens lat/lng inputs on click and saves, trickling to the API', async () => {
      setMediaLocation.mockResolvedValue({})
      const onRedated = vi.fn()
      renderMeta({}, null, { path: 'archive/x.jpg', onRedated })
      fireEvent.click(screen.getByRole('button', { name: 'Set location' }))
      fireEvent.change(screen.getByPlaceholderText('lat'), { target: { value: '42.8' } })
      fireEvent.change(screen.getByPlaceholderText('lng'), { target: { value: '-71.1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(setMediaLocation).toHaveBeenCalledWith('archive/x.jpg', {
        latitude: 42.8, longitude: -71.1, place_name: null,
      }))
      await waitFor(() => expect(onRedated).toHaveBeenCalled())
    })

    it('populates lat/lng from a quick-pick place and sends its name', async () => {
      getPlaceShortcuts.mockResolvedValue([{ name: 'plaistow', latitude: 42.84, longitude: -71.11 }])
      setMediaLocation.mockResolvedValue({})
      renderMeta({}, null, { path: 'a.jpg' })
      fireEvent.click(screen.getByRole('button', { name: 'Set location' }))
      // dropdown appears once shortcuts load
      const select = await screen.findByRole('combobox')
      fireEvent.change(select, { target: { value: 'plaistow' } })
      expect(screen.getByPlaceholderText('lat').value).toBe('42.84')
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(setMediaLocation).toHaveBeenCalledWith('a.jpg', {
        latitude: 42.84, longitude: -71.11, place_name: 'plaistow',
      }))
    })

    it('rejects out-of-range coordinates without calling the API', () => {
      renderMeta({}, null, { path: 'a.jpg' })
      fireEvent.click(screen.getByRole('button', { name: 'Set location' }))
      fireEvent.change(screen.getByPlaceholderText('lat'), { target: { value: '999' } })
      fireEvent.change(screen.getByPlaceholderText('lng'), { target: { value: '0' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(setMediaLocation).not.toHaveBeenCalled()
      expect(screen.getByText('Enter valid lat, lng')).toBeInTheDocument()
    })

    it('rejects a non-numeric latitude', () => {
      renderMeta({}, null, { path: 'a.jpg' })
      fireEvent.click(screen.getByRole('button', { name: 'Set location' }))
      fireEvent.change(screen.getByPlaceholderText('lat'), { target: { value: 'abc' } })
      fireEvent.change(screen.getByPlaceholderText('lng'), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(setMediaLocation).not.toHaveBeenCalled()
    })

    it('rejects a non-numeric longitude', () => {
      renderMeta({}, null, { path: 'a.jpg' })
      fireEvent.click(screen.getByRole('button', { name: 'Set location' }))
      fireEvent.change(screen.getByPlaceholderText('lat'), { target: { value: '1' } })
      fireEvent.change(screen.getByPlaceholderText('lng'), { target: { value: 'abc' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(setMediaLocation).not.toHaveBeenCalled()
    })

    it('pre-fills the inputs from an existing location when editing', () => {
      renderMeta({ location: { primary: { latitude: 42.5, longitude: -71.2, source: 'manual' } } }, null, { path: 'a.jpg' })
      fireEvent.click(screen.getByRole('button', { name: 'Edit location' }))
      expect(screen.getByPlaceholderText('lat').value).toBe('42.5')
      expect(screen.getByPlaceholderText('lng').value).toBe('-71.2')
    })

    it('falls back to a generic message when the error has none', async () => {
      setMediaLocation.mockRejectedValue(new Error(''))
      renderMeta({}, null, { path: 'a.jpg' })
      fireEvent.click(screen.getByRole('button', { name: 'Set location' }))
      fireEvent.change(screen.getByPlaceholderText('lat'), { target: { value: '1' } })
      fireEvent.change(screen.getByPlaceholderText('lng'), { target: { value: '2' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(screen.getByText('Save failed')).toBeInTheDocument())
    })

    it('surfaces an API error message', async () => {
      setMediaLocation.mockRejectedValue(new Error('boom'))
      renderMeta({}, null, { path: 'a.jpg' })
      fireEvent.click(screen.getByRole('button', { name: 'Set location' }))
      fireEvent.change(screen.getByPlaceholderText('lat'), { target: { value: '1' } })
      fireEvent.change(screen.getByPlaceholderText('lng'), { target: { value: '2' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
    })

    it('cancels back to the button without saving', () => {
      renderMeta({}, null, { path: 'a.jpg' })
      fireEvent.click(screen.getByRole('button', { name: 'Set location' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.getByRole('button', { name: 'Set location' })).toBeInTheDocument()
      expect(setMediaLocation).not.toHaveBeenCalled()
    })

    describe('geocode search (debounced, auto)', () => {
      function openEditor() {
        renderMeta({}, null, { path: 'a.jpg' })
        fireEvent.click(screen.getByRole('button', { name: 'Set location' }))
      }
      const type = v => fireEvent.change(screen.getByPlaceholderText('Search a city, state…'), { target: { value: v } })

      it('auto-searches after typing and fills coords when a result is picked', async () => {
        geocodePlace.mockResolvedValue([
          { display_name: 'Haverhill, Essex County, Massachusetts', latitude: 42.78, longitude: -71.08 },
        ])
        openEditor()
        type('Haverhill, MA')   // no button — debounce fires the search
        const result = await screen.findByRole('button', { name: /Haverhill, Essex County/ })
        await waitFor(() => expect(geocodePlace).toHaveBeenCalledWith('Haverhill, MA'))
        fireEvent.click(result)
        expect(screen.getByPlaceholderText('lat').value).toBe('42.78')
        expect(screen.getByPlaceholderText('lng').value).toBe('-71.08')
        // the chosen city flows into the saved place_name
        setMediaLocation.mockResolvedValue({})
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))
        await waitFor(() => expect(setMediaLocation).toHaveBeenCalledWith('a.jpg', {
          latitude: 42.78, longitude: -71.08, place_name: 'Haverhill',
        }))
      })

      it('picks a result with no display_name (place_name falls back to empty)', async () => {
        geocodePlace.mockResolvedValue([{ latitude: 5, longitude: 6 }])
        setMediaLocation.mockResolvedValue({})
        openEditor()
        type('somewhere')
        const result = await screen.findByRole('button', { name: '' })
        fireEvent.click(result)
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))
        await waitFor(() => expect(setMediaLocation).toHaveBeenCalledWith('a.jpg', {
          latitude: 5, longitude: 6, place_name: null,
        }))
      })

      it('does not search for a query under 2 characters', () => {
        openEditor()
        type(' x ')   // trims to 1 char → no search scheduled
        expect(geocodePlace).not.toHaveBeenCalled()
      })

      it('shows "No matches" when the search returns nothing', async () => {
        geocodePlace.mockResolvedValue([])
        openEditor()
        type('Nowhere')
        await waitFor(() => expect(screen.getByText('No matches')).toBeInTheDocument())
      })

      it('shows "Search failed" when geocode throws', async () => {
        geocodePlace.mockRejectedValue(new Error('net'))
        openEditor()
        type('Boom')
        await waitFor(() => expect(screen.getByText('Search failed')).toBeInTheDocument())
      })

      it('discards an in-flight result when the query changes mid-search', async () => {
        let resolveFirst
        const firstPromise = new Promise(res => { resolveFirst = res })
        geocodePlace
          .mockReturnValueOnce(firstPromise)                                              // 'AAAA' (slow)
          .mockResolvedValueOnce([{ display_name: 'Second', latitude: 9, longitude: 9 }]) // 'BBBB'
        openEditor()
        type('AAAA')
        await waitFor(() => expect(geocodePlace).toHaveBeenCalledWith('AAAA'))
        type('BBBB')   // effect cleanup marks the first search stale (alive=false)
        await waitFor(() => expect(geocodePlace).toHaveBeenCalledWith('BBBB'))
        // resolve the stale first AFTER the query moved on → must be ignored
        await act(async () => { resolveFirst([{ display_name: 'First-STALE', latitude: 1, longitude: 1 }]); await Promise.resolve() })
        expect(await screen.findByRole('button', { name: /Second/ })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /First-STALE/ })).not.toBeInTheDocument()
      })
    })
  })
})
