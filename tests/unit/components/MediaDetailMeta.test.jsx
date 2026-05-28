import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the Leaflet-backed map — its real impl needs a real canvas which
// jsdom doesn't have, and it's excluded from coverage anyway.
vi.mock('../../../src/components/MiniMap', () => ({
  MiniMap: ({ lat, lng }) => <div data-testid="minimap" data-lat={lat} data-lng={lng} />,
}))

import { MediaDetailMeta } from '../../../src/components/MediaDetailMeta'

function renderMeta(sidecar, heritage) {
  return render(<MediaDetailMeta sidecar={sidecar} heritage={heritage} />)
}

describe('MediaDetailMeta', () => {
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
    it('omits the Location section when none of the cues are present', () => {
      renderMeta({})
      expect(screen.queryByText('Location')).not.toBeInTheDocument()
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

  describe('landmark confidence', () => {
    it('treats a landmark with no confidence as 0 → skipped', () => {
      renderMeta({
        location: { landmarks: [{ landmark: { name: 'X' } }] },
      }, { place_name: '_' })
      expect(screen.queryByText(/X \(/)).not.toBeInTheDocument()
    })
  })
})
