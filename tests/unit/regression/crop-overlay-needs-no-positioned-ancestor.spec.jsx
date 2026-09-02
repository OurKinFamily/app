import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MediaDetail } from '../../../src/v2/ui/MediaDetail'

const item = {
  path: 'archive/2026/x.jpg', url: '/api/media/archive/2026/x.jpg',
  thumbnail_url: '/t.webp', filename: 'x.jpg', width: 900, height: 900,
}

/**
 * Regression: pressing Crop appeared to do nothing.
 *
 * The overlay measured the photograph against its `offsetParent` and returned
 * early when there wasn't one, so the rect stayed null, the overlay never
 * rendered, and there was nothing to drag or apply — no request ever reached
 * the API. It measures against the window now and positions itself fixed.
 */
describe('crop flow', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    // jsdom lays nothing out, so every element measures zero — and a zero-size
    // photograph is exactly the state the overlay now refuses to draw on.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    })
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    }
  })

  it('shows the crop overlay and sends a rectangle', async () => {
    const onCrop = vi.fn()
    render(
      <MemoryRouter>
        <MediaDetail item={item} onClose={() => {}} onCrop={onCrop} />
      </MemoryRouter>,
    )
    const button = await screen.findByLabelText('Crop')
    fireEvent.click(button)
    // The Crop confirm button only exists once the overlay is up.
    const apply = await screen.findByText(/^Crop$/)
    expect(apply).toBeTruthy()
    fireEvent.click(apply)
    await new Promise(r => setTimeout(r, 20))
    expect(onCrop).toHaveBeenCalled()
    // Never a degenerate rectangle: the server refuses those with a 422, which
    // looks from the outside like a button that does nothing.
    const [, rect] = onCrop.mock.calls[0]
    expect(rect.w).toBeGreaterThan(32)
    expect(rect.h).toBeGreaterThan(32)
  })
})
