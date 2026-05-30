import { describe, it, expect } from 'vitest'
import { bboxRect, onMediaError } from '../../../src/components/mediaLightboxHelpers'
import { MEDIA_VERSION } from '../../../src/lib/media'

// Fake DOM element — enough for bboxRect to do its math without jsdom.
function fakeEl({ cw = 800, ch = 600, ox = 10, oy = 20, nw = 1600, nh = 1200 } = {}) {
  return { clientWidth: cw, clientHeight: ch, offsetLeft: ox, offsetTop: oy, naturalWidth: nw, naturalHeight: nh }
}

describe('bboxRect', () => {
  describe('degenerate inputs', () => {
    it('returns null when the element has no rendered size yet', () => {
      expect(bboxRect(fakeEl({ cw: 0, ch: 0 }), [0, 0, 1, 1])).toBe(null)
    })
    it('returns null for a null element', () => {
      expect(bboxRect(null, [0, 0, 1, 1])).toBe(null)
    })
    it('returns null for pixel-space bbox when natural dims are unknown', () => {
      const el = fakeEl()
      el.naturalWidth  = 0
      el.naturalHeight = 0
      expect(bboxRect(el, [100, 100, 200, 200])).toBe(null)
    })
  })

  describe('coordinate-space detection', () => {
    it('treats coords ≤ 1.5 as normalized and scales to client size', () => {
      const r = bboxRect(fakeEl(), [0.25, 0.25, 0.75, 0.75])
      expect(r).toEqual({
        left:   10 + 0.25 * 800,
        top:    20 + 0.25 * 600,
        width:  0.5 * 800,
        height: 0.5 * 600,
      })
    })
    it('treats coords > 1.5 as pixel-space and scales to natural size', () => {
      // 1600x1200 natural rendered at 800x600 → halved.
      const r = bboxRect(fakeEl(), [400, 300, 800, 900])
      expect(r).toEqual({
        left:   10 + 400 * (800 / 1600),
        top:    20 + 300 * (600 / 1200),
        width:  (800 - 400) * (800 / 1600),
        height: (900 - 300) * (600 / 1200),
      })
    })
    it('uses videoWidth/videoHeight when set instead of naturalWidth/Height', () => {
      // Videos report dimensions via videoWidth/videoHeight, not natural*.
      const el = { clientWidth: 400, clientHeight: 300, offsetLeft: 0, offsetTop: 0, videoWidth: 800, videoHeight: 600 }
      const r = bboxRect(el, [200, 150, 400, 300])
      expect(r.left).toBe(200 * (400 / 800))
    })
  })

  describe('padding', () => {
    it('expands the rect outward by the pad value', () => {
      const r = bboxRect(fakeEl(), [0, 0, 1, 1], 5)
      expect(r.left).toBe(10 - 5)
      expect(r.top).toBe(20 - 5)
      expect(r.width).toBe(800 + 10)
      expect(r.height).toBe(600 + 10)
    })
  })
})

describe('onMediaError', () => {
  // Fake event element — onMediaError reads e.currentTarget.src, mutates
  // .src, .dataset.tried, .style.display.
  function fakeEvent({ src = '', tried = '' } = {}) {
    return {
      currentTarget: {
        src,
        dataset: { tried },
        style:   { display: '' },
      },
    }
  }

  describe('fallback chain', () => {
    it('falls back from the medium URL to /api/media/<path> when path is set', () => {
      const e = fakeEvent({ src: 'https://example.com/medium/foo.jpg' })
      onMediaError(e, { path: 'foo.jpg' })
      expect(e.currentTarget.src).toBe(`/api/media/foo.jpg?v=${MEDIA_VERSION}`)
    })
    it('falls back from /api/media/ to the thumbnail_url when present', () => {
      const versioned = `/api/media/foo.jpg?v=${MEDIA_VERSION}`
      const e = fakeEvent({
        src:     versioned,
        tried:   versioned,  // already tried
      })
      onMediaError(e, { path: 'foo.jpg', thumbnail_url: '/api/media/thumb/foo.jpg' })
      expect(e.currentTarget.src).toBe('/api/media/thumb/foo.jpg')
    })
    it('prefers an explicit item.url over deriving from item.path', () => {
      const e = fakeEvent({ src: 'https://cdn.example.com/foo.jpg' })
      onMediaError(e, { url: '/custom/foo.jpg', path: 'foo.jpg' })
      expect(e.currentTarget.src).toBe('/custom/foo.jpg')
    })
  })

  describe('loop prevention', () => {
    it('records each URL it tries on dataset.tried', () => {
      const e = fakeEvent({ src: 'https://example.com/medium/foo.jpg' })
      onMediaError(e, { path: 'foo.jpg' })
      const tried = e.currentTarget.dataset.tried.split('|').filter(Boolean)
      expect(tried).toContain('https://example.com/medium/foo.jpg')
      expect(tried).toContain(`/api/media/foo.jpg?v=${MEDIA_VERSION}`)
    })
    it('hides the element once every candidate has been tried', () => {
      const versioned = `/api/media/foo.jpg?v=${MEDIA_VERSION}`
      const e = fakeEvent({
        src:     versioned,
        tried:   [versioned, '/api/media/thumb/foo.jpg'].join('|'),
      })
      onMediaError(e, { path: 'foo.jpg', thumbnail_url: '/api/media/thumb/foo.jpg' })
      // regression(2026-05-27): the fallback chain could loop between the
      // same two URLs forever; once exhausted we hide the element instead.
      expect(e.currentTarget.style.display).toBe('none')
    })
  })

  describe('when no candidates are available', () => {
    it('hides the element straight away', () => {
      const e = fakeEvent({ src: '' })
      onMediaError(e, {})
      expect(e.currentTarget.style.display).toBe('none')
    })
  })
})
