import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCropDrag, MIN } from '../../../src/lib/useCropDrag'

const BOX = { x1: 0.2, y1: 0.2, x2: 0.8, y2: 0.8 }
const RECT = { left: 0, top: 0, width: 1000, height: 1000 }

// The real hook is handed a converter from pointer event to fraction of the
// displayed photograph; with a 1000px square that is just /1000.
const toFraction = e => ({ x: e.clientX / 1000, y: e.clientY / 1000 })

function setup(drag, over = {}) {
  const onChange = vi.fn()
  const onAngle = vi.fn()
  const setDrag = vi.fn()
  const args = {
    drag, setDrag, box: BOX, onChange, onAngle, angle: 0, imageRect: RECT, toFraction, ...over,
  }
  const view = renderHook(() => useCropDrag(args))
  return { ...args, ...view, last: () => onChange.mock.lastCall?.[0] }
}

const pointerMove = (x, y) => {
  const e = new Event('pointermove', { bubbles: true, cancelable: true })
  Object.assign(e, { clientX: x, clientY: y })
  window.dispatchEvent(e)
  return e
}
const pointerUp = () => window.dispatchEvent(new Event('pointerup'))

describe('useCropDrag', () => {
  describe('when nothing is being dragged', () => {
    it('ignores the pointer entirely', () => {
      const s = setup(null)
      pointerMove(500, 500)
      expect(s.onChange).not.toHaveBeenCalled()
    })
  })

  describe('drawing a new rectangle', () => {
    it('follows the pointer from where the press started', () => {
      const s = setup({ mode: 'draw', origin: { x: 0.1, y: 0.1 } })
      pointerMove(600, 700)
      expect(s.last()).toEqual({ x1: 0.1, y1: 0.1, x2: 0.6, y2: 0.7 })
    })

    // Dragging up and to the left is as natural as down and to the right.
    it('copes with a rectangle drawn backwards', () => {
      const s = setup({ mode: 'draw', origin: { x: 0.8, y: 0.9 } })
      pointerMove(200, 300)
      expect(s.last()).toEqual({ x1: 0.2, y1: 0.3, x2: 0.8, y2: 0.9 })
    })

    it('stops the browser painting a text selection over the photograph', () => {
      setup({ mode: 'draw', origin: { x: 0.1, y: 0.1 } })
      const e = pointerMove(600, 700)
      expect(e.defaultPrevented).toBe(true)
    })
  })

  describe('moving the whole rectangle', () => {
    it('keeps its size, holding the point that was grabbed', () => {
      const s = setup({ mode: 'move', box: BOX, grab: { x: 0.1, y: 0.1 } })
      pointerMove(500, 500)
      const moved = s.last()
      expect(moved.x1).toBeCloseTo(0.4, 5)
      expect(moved.y1).toBeCloseTo(0.4, 5)
      // The size is what must survive a move.
      expect(moved.x2 - moved.x1).toBeCloseTo(BOX.x2 - BOX.x1, 5)
      expect(moved.y2 - moved.y1).toBeCloseTo(BOX.y2 - BOX.y1, 5)
    })

    it('will not push it off the edge of the photograph', () => {
      const s = setup({ mode: 'move', box: BOX, grab: { x: 0.1, y: 0.1 } })
      pointerMove(9000, 9000)
      const { x2, y2 } = s.last()
      expect(x2).toBeLessThanOrEqual(1)
      expect(y2).toBeLessThanOrEqual(1)
    })
  })

  describe('pulling an edge', () => {
    it.each([
      ['n', 0.3, { y1: 0.3 }],
      ['s', 0.9, { y2: 0.9 }],
      ['w', 0.1, { x1: 0.1 }],
      ['e', 0.95, { x2: 0.95 }],
    ])('moves the %s side', (mode, at, expected) => {
      const s = setup({ mode, box: BOX })
      pointerMove(at * 1000, at * 1000)
      expect(s.last()).toMatchObject(expected)
    })

    it('treats a corner as two edges at once', () => {
      const s = setup({ mode: 'nw', box: BOX })
      pointerMove(100, 150)
      expect(s.last()).toMatchObject({ x1: 0.1, y1: 0.15 })
    })

    // Dragging one edge past the other would invert the rectangle.
    it('will not pull a side through its opposite', () => {
      const s = setup({ mode: 'n', box: BOX })
      pointerMove(0, 950)
      expect(s.last().y1).toBeCloseTo(BOX.y2 - MIN, 5)
    })
  })

  describe('turning the photograph straight', () => {
    it('reports the angle swept around the middle', () => {
      const s = setup({ mode: 'turn', angle: 0, from: 0 })
      // Measured from the centre (500,500), where due east is 0°. This lands
      // 30° round — inside the clamp, so it is the sweep being tested and not
      // the limit.
      pointerMove(500 + 400 * Math.cos(Math.PI / 6), 500 + 400 * Math.sin(Math.PI / 6))
      expect(s.onAngle).toHaveBeenCalledWith(30)
    })

    it('adds to the angle it already had', () => {
      const s = setup({ mode: 'turn', angle: 10, from: 0 })
      pointerMove(500, 1000)
      expect(s.onAngle).toHaveBeenCalledWith(45)  // 10 + 90, clamped
    })

    // Past 45° it stops being straightening and becomes a rotation, which the
    // lossless quarter-turn button already does properly.
    it('stops at a quarter of a right angle either way', () => {
      const s = setup({ mode: 'turn', angle: 0, from: 0 })
      pointerMove(500, 1000)
      expect(s.onAngle).toHaveBeenCalledWith(45)
      pointerMove(500, 0)
      expect(s.onAngle).toHaveBeenLastCalledWith(-45)
    })

    it('rounds to a tenth of a degree', () => {
      const s = setup({ mode: 'turn', angle: 0, from: 0 })
      pointerMove(1000, 501)
      const [angle] = s.onAngle.mock.lastCall
      expect(angle).toBe(Math.round(angle * 10) / 10)
    })
  })

  describe('letting go', () => {
    it('ends the gesture', () => {
      const s = setup({ mode: 'draw', origin: { x: 0.1, y: 0.1 } })
      pointerUp()
      expect(s.setDrag).toHaveBeenCalledWith(null)
    })

    // A press with no real drag collapses the box to nothing, and Crop then
    // asks for a zero-width rectangle — which the server refuses, so the
    // button appears to do nothing.
    it('puts the old rectangle back after a stray click', () => {
      const previous = { ...BOX }
      const s = setup(
        { mode: 'draw', origin: { x: 0.5, y: 0.5 }, previous },
        { box: { x1: 0.5, y1: 0.5, x2: 0.501, y2: 0.501 } },
      )
      pointerUp()
      expect(s.onChange).toHaveBeenCalledWith(previous)
    })

    it('keeps a rectangle that was actually drawn', () => {
      const s = setup(
        { mode: 'draw', origin: { x: 0.1, y: 0.1 }, previous: { ...BOX } },
        { box: { x1: 0.1, y1: 0.1, x2: 0.7, y2: 0.7 } },
      )
      pointerUp()
      expect(s.onChange).not.toHaveBeenCalled()
    })
  })

  describe('once the gesture is over', () => {
    it('stops listening to the pointer', () => {
      const s = setup({ mode: 'draw', origin: { x: 0.1, y: 0.1 } })
      s.unmount()
      pointerMove(600, 700)
      expect(s.onChange).not.toHaveBeenCalled()
    })
  })
})
