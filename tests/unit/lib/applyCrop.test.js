import { describe, it, expect, vi } from 'vitest'
import { applyCrop } from '../../../src/lib/applyCrop'

// A whole-image box is x1/y1 = 0, x2/y2 = 1 — fractions of what is on screen.
const BOX = { x1: 0, y1: 0, x2: 1, y2: 1 }

function setup(over = {}) {
  const onCrop = vi.fn().mockResolvedValue(undefined)
  const args = {
    item: { width: 1000, height: 800 },
    box: BOX,
    angle: 0,
    imgRef: { current: null },
    onCrop,
    setCropping: vi.fn(),
    setCrop: vi.fn(),
    setAngle: vi.fn(),
    ...over,
  }
  return { args, ...args, rect: () => onCrop.mock.calls[0]?.[1] }
}

describe('applyCrop', () => {
  describe('turning a drawn box into pixels', () => {
    it('scales the fractions up to the full-size photograph', async () => {
      const s = setup({ box: { x1: 0.25, y1: 0.5, x2: 0.75, y2: 1 } })
      await applyCrop(s.args)
      expect(s.rect()).toMatchObject({ x: 250, y: 400, w: 500, h: 400 })
    })

    it('falls back to the loaded image when the item has no dimensions', async () => {
      const s = setup({
        item: {},
        imgRef: { current: { naturalWidth: 600, naturalHeight: 400 } },
      })
      await applyCrop(s.args)
      expect(s.rect()).toMatchObject({ w: 600, h: 400 })
    })

    it('does nothing at all when the size is unknown', async () => {
      const s = setup({ item: {}, imgRef: { current: null } })
      await applyCrop(s.args)
      expect(s.onCrop).not.toHaveBeenCalled()
      expect(s.setCropping).not.toHaveBeenCalled()
    })
  })

  describe('when the photograph has been straightened', () => {
    // Turning a rectangle and keeping its corners always makes it bigger. The
    // server rotates with expand too, so both must agree on the new size or
    // the crop lands somewhere else entirely.
    it('measures against the grown picture, not the original', async () => {
      const s = setup({ angle: 90 })
      await applyCrop(s.args)
      // At 90° the sides swap: 1000x800 becomes 800x1000.
      expect(s.rect()).toMatchObject({ w: 800, h: 1000 })
    })

    it('grows the same amount whichever way it was turned', async () => {
      const clockwise = setup({ angle: 10 })
      await applyCrop(clockwise.args)
      const anticlockwise = setup({ angle: -10 })
      await applyCrop(anticlockwise.args)
      const { w, h } = clockwise.rect()
      expect(anticlockwise.rect()).toMatchObject({ w, h })
    })

    it('passes the angle along so the server straightens too', async () => {
      const s = setup({ angle: 3.5 })
      await applyCrop(s.args)
      expect(s.rect().angle).toBe(3.5)
    })

    // The crop has already straightened the file. Leaving the preview's
    // transform on meant the photograph looked as crooked as before until the
    // page was reloaded.
    it('stops the preview turning it once the crop lands', async () => {
      const s = setup({ angle: 3.5 })
      await applyCrop(s.args)
      expect(s.setAngle).toHaveBeenCalledWith(0)
    })
  })

  describe('when the box is too small to send', () => {
    // The server refuses anything under 32px a side, and a refused request
    // looks exactly like a button that does nothing.
    it.each([
      ['too narrow', { x1: 0, y1: 0, x2: 0.02, y2: 1 }],
      ['too short', { x1: 0, y1: 0, x2: 1, y2: 0.02 }],
    ])('refuses it here instead — %s', async (_, box) => {
      const s = setup({ box })
      await applyCrop(s.args)
      expect(s.onCrop).not.toHaveBeenCalled()
    })

    it('leaves the crop open so the box can be redrawn', async () => {
      const s = setup({ box: { x1: 0, y1: 0, x2: 0.01, y2: 0.01 } })
      await applyCrop(s.args)
      expect(s.setCrop).not.toHaveBeenCalled()
    })
  })

  describe('while the crop is in flight', () => {
    it('marks it busy and clears that when it lands', async () => {
      const s = setup()
      await applyCrop(s.args)
      expect(s.setCropping.mock.calls).toEqual([[true], [false]])
      expect(s.setCrop).toHaveBeenCalledWith(false)
    })

    it('clears busy even when the crop fails', async () => {
      const onCrop = vi.fn().mockRejectedValue(new Error('the server said no'))
      const s = setup({ onCrop })
      await expect(applyCrop(s.args)).rejects.toThrow('the server said no')
      expect(s.setCropping).toHaveBeenLastCalledWith(false)
      // The overlay stays open, because nothing was cropped.
      expect(s.setCrop).not.toHaveBeenCalled()
    })
  })
})
