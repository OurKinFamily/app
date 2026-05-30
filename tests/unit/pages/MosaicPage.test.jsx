import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { MosaicPage } from '../../../src/pages/MosaicPage'
import { MEDIA_VERSION } from '../../../src/lib/media'
import { renderWithRouter, mockFetch } from '../helpers'

// Lightweight UI-only tests. We never hit /api/admin/mosaic/render here —
// rendering an actual mosaic is the API's responsibility and the JPEG bytes
// don't help React-Testing-Library. What matters in the UI:
//   1. Source preview picks up the `?source=...` query param
//   2. Picker is shown only when no source is loaded
//   3. Simple mode shows Details presets + a Show-advanced link
//   4. Advanced mode reveals the additional knobs (and Back link works)
//   5. Clicking a Details preset triggers the render fetch with the
//      locked-good params (saliency / 3×3 / LAB / square / mean / reuse 10).

describe('MosaicPage', () => {
  beforeEach(() => {
    // Default fetch — every test that does NOT trigger a render still gets
    // a safe stub because the people-search useEffect may fire.
    mockFetch([])
    // jsdom's URL.createObjectURL doesn't exist by default.
    global.URL.createObjectURL = vi.fn(() => 'blob:mock')
  })

  it('shows the empty picker when no source is set', () => {
    renderWithRouter(<MosaicPage />, { route: '/admin/mosaic' })
    expect(screen.getByText(/pick an image/i)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /source/i })).not.toBeInTheDocument()
  })

  it('preloads the source preview from ?source= query param', () => {
    renderWithRouter(<MosaicPage />, {
      route: '/admin/mosaic?source=archive/2020/05/x.jpg',
    })
    const img = screen.getByAltText('source')
    expect(img).toHaveAttribute('src', `/api/media/medium/archive/2020/05/x.jpg?v=${MEDIA_VERSION}`)
    // Picker drop-zone is hidden when a source is loaded.
    expect(screen.queryByText(/pick an image/i)).not.toBeInTheDocument()
  })

  it('shows Details presets by default and reveals advanced on click', () => {
    renderWithRouter(<MosaicPage />, {
      route: '/admin/mosaic?source=archive/2020/05/x.jpg',
    })
    // Simple mode visible.
    expect(screen.getByRole('button', { name: /^Coarse/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Fine/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Veryfine/i })).toBeInTheDocument()
    // Advanced knobs hidden by default.
    expect(screen.queryByText(/print preset/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/edge-aware/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText(/show advanced settings/i))
    expect(screen.getByText(/print preset/i)).toBeInTheDocument()
    expect(screen.getByText(/edge-aware/i)).toBeInTheDocument()
    expect(screen.getByText(/tile shape/i)).toBeInTheDocument()
  })

  it('returns to simple mode from the back link', () => {
    renderWithRouter(<MosaicPage />, {
      route: '/admin/mosaic?source=archive/2020/05/x.jpg',
    })
    fireEvent.click(screen.getByText(/show advanced settings/i))
    fireEvent.click(screen.getByText(/back to simple/i))
    expect(screen.queryByText(/print preset/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Coarse/i })).toBeInTheDocument()
  })

  it('disables Details presets when no source is loaded', () => {
    renderWithRouter(<MosaicPage />, { route: '/admin/mosaic' })
    expect(screen.getByRole('button', { name: /^Coarse/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Fine/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Veryfine/i })).toBeDisabled()
  })

  it('fires render with the locked Coarse preset params when clicked', async () => {
    // Render returns the JPEG bytes — we just want to inspect what got sent.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },  // no x-mosaic-meta
      blob: async () => new Blob(['fake']),
    })
    global.fetch = fetchMock

    renderWithRouter(<MosaicPage />, {
      route: '/admin/mosaic?source=archive/2020/05/x.jpg',
    })
    fireEvent.click(screen.getByRole('button', { name: /^Coarse/i }))

    // The fetch call we care about.
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/mosaic/render',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
    )
    const fd = fetchMock.mock.calls[0][1].body
    // Coarse preset locked-good params.
    expect(fd.get('grid_w')).toBe('60')
    expect(fd.get('grid_h')).toBe('80')
    expect(fd.get('tile_size')).toBe('64')
    expect(fd.get('color')).toBe('mean')
    expect(fd.get('shape')).toBe('square')
    expect(fd.get('color_distance')).toBe('lab')
    expect(fd.get('source_smooth')).toBe('3')
    expect(fd.get('crop')).toBe('center')
    expect(fd.get('max_reuse')).toBe('10')
    expect(fd.get('edge_aware')).toBe('false')
    // The preloaded path is sent, not a file upload.
    expect(fd.get('source_path')).toBe('archive/2020/05/x.jpg')
    expect(fd.get('source')).toBeNull()
  })

  it('renders the Filesystem-page-like header with neo4j badge and POC tag', () => {
    renderWithRouter(<MosaicPage />, { route: '/admin/mosaic' })
    expect(screen.getByRole('heading', { name: /mosaic/i })).toBeInTheDocument()
    expect(screen.getByText(/poc/i)).toBeInTheDocument()
  })
})
