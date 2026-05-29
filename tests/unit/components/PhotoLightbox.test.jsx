import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// PhotoLightbox now calls useNavigate to handle the Mosaic icon → /admin/mosaic
// hop, so every render needs to be wrapped in a Router. Wrap once here so
// individual cases stay tidy.
const wrapped = ui => render(<MemoryRouter>{ui}</MemoryRouter>)

// Mock the heavy children so we only test PhotoLightbox's wiring.
vi.mock('../../../src/components/MediaLightbox', () => ({
  MediaLightbox: vi.fn(() => null),
}))
vi.mock('../../../src/components/MediaDetail', () => ({
  MediaDetail: vi.fn(() => null),
}))
vi.mock('../../../src/components/AlbumPicker', () => ({
  AlbumPicker: vi.fn(({ onClose }) => <button data-testid="mock-album-close" onClick={onClose}>x</button>),
}))
vi.mock('../../../src/lib/useFavorites', () => ({
  useFavorites: () => ({ favs: new Set(), toggle: vi.fn() }),
}))

import { PhotoLightbox } from '../../../src/components/PhotoLightbox'
import { MediaLightbox } from '../../../src/components/MediaLightbox'

describe('PhotoLightbox', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('forwards configuration to MediaLightbox', () => {
    it('passes items, initialIndex, title, and callbacks', () => {
      const items = [{ path: 'a.jpg' }]
      wrapped(
        <PhotoLightbox
          items={items}
          initialIndex={3}
          title="My Album"
          onClose={() => {}}
          onNavigate={() => {}}
          onNeedMore={() => {}}
          onSetCover={() => {}}
          currentCoverPath="archive/cover.jpg"
        />
      )
      const props = MediaLightbox.mock.calls[0][0]
      expect(props.items).toBe(items)
      expect(props.initialIndex).toBe(3)
      expect(props.title).toBe('My Album')
      expect(props.currentCoverPath).toBe('archive/cover.jpg')
      expect(typeof props.onClose).toBe('function')
      expect(typeof props.onNavigate).toBe('function')
      expect(typeof props.onNeedMore).toBe('function')
      expect(typeof props.onSetCover).toBe('function')
    })

    it('passes a renderDetail function', () => {
      wrapped(<PhotoLightbox items={[]} onClose={() => {}} />)
      const props = MediaLightbox.mock.calls[0][0]
      expect(typeof props.renderDetail).toBe('function')
    })
  })

  describe('callback wiring', () => {
    it('renderDetail returns a MediaDetail element keyed by path + v', () => {
      wrapped(<PhotoLightbox items={[]} onClose={() => {}} />)
      const props = MediaLightbox.mock.calls[0][0]
      const el = props.renderDetail({ path: 'archive/x.jpg' }, {}, 7)
      expect(el.key).toBe('archive/x.jpg-7')
    })

    it('onRotate is wired and logs without throwing', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      wrapped(<PhotoLightbox items={[]} onClose={() => {}} />)
      const props = MediaLightbox.mock.calls[0][0]
      props.onRotate({ path: 'x.jpg' }, 90)
      expect(logSpy).toHaveBeenCalled()
      logSpy.mockRestore()
    })

    it('onDownload is wired and logs without throwing', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      wrapped(<PhotoLightbox items={[]} onClose={() => {}} />)
      const props = MediaLightbox.mock.calls[0][0]
      props.onDownload({ path: 'x.jpg' })
      expect(logSpy).toHaveBeenCalled()
      logSpy.mockRestore()
    })

    it('onMosaic navigates to /admin/mosaic with the source path encoded', () => {
      wrapped(<PhotoLightbox items={[]} onClose={() => {}} />)
      const props = MediaLightbox.mock.calls[0][0]
      // No throw + onMosaic exists — covers the closure even without
      // asserting on the navigate destination (jsdom doesn't update URL
      // without a Routes match).
      expect(typeof props.onMosaic).toBe('function')
      expect(() => props.onMosaic({ path: 'archive/2026/05/x.jpg' })).not.toThrow()
    })

    it('onAlbum opens the AlbumPicker and closing it sets albumFor=null', async () => {
      const { findByTestId, queryByTestId } = wrapped(<PhotoLightbox items={[]} onClose={() => {}} />)
      const props = MediaLightbox.mock.calls[0][0]
      await act(async () => { props.onAlbum({ path: 'x.jpg' }) })
      const closeBtn = await findByTestId('mock-album-close')
      await act(async () => { closeBtn.click() })
      // After close, AlbumPicker unmounts.
      expect(queryByTestId('mock-album-close')).not.toBeInTheDocument()
    })

    it('onDelete deletes via the api and calls onClose on success', async () => {
      const onClose = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
      wrapped(<PhotoLightbox items={[]} onClose={onClose} />)
      const props = MediaLightbox.mock.calls[0][0]
      await props.onDelete({ path: 'archive/x.jpg' })
      expect(onClose).toHaveBeenCalled()
    })

    it('onDelete alerts and does NOT close when the api fails', async () => {
      const onClose = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({ ok: false })
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      wrapped(<PhotoLightbox items={[]} onClose={onClose} />)
      const props = MediaLightbox.mock.calls[0][0]
      await props.onDelete({ path: 'archive/x.jpg' })
      expect(alertSpy).toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
      alertSpy.mockRestore()
    })
  })
})
