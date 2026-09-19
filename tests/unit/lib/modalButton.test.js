import { describe, it, expect } from 'vitest'
import { modalButton } from '../../../src/lib/modalButton'

describe('modalButton', () => {
  describe('the button that does the thing', () => {
    it('is filled, so it reads as the answer', () => {
      const style = modalButton(true)
      expect(style.background).not.toBe('transparent')
      expect(style.color).toBe('#fff')
      expect(style.border).toBe(0)
    })
  })

  describe('the button that does not', () => {
    it('is outlined rather than filled', () => {
      const style = modalButton(false)
      expect(style.background).toBe('transparent')
      expect(style.border).toContain('1px solid')
    })
  })

  describe('when the action is unavailable', () => {
    it('fades and stops inviting a click', () => {
      const style = modalButton(true, true)
      expect(style.opacity).toBe(0.5)
      expect(style.cursor).toBe('default')
    })

    it('is fully opaque and clickable otherwise', () => {
      const style = modalButton(true, false)
      expect(style.opacity).toBe(1)
      expect(style.cursor).toBe('pointer')
    })
  })

  // Shared so a Cancel is the same shape wherever it appears.
  it('keeps both buttons the same size', () => {
    const { height, padding, borderRadius, fontSize } = modalButton(true)
    expect(modalButton(false)).toMatchObject({ height, padding, borderRadius, fontSize })
  })
})
