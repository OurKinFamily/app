import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { useLightboxKeys } from '../../../src/lib/useLightboxKeys'

function setup(over = {}) {
  const handlers = {
    onClose: vi.fn(), onPrev: vi.fn(), onNext: vi.fn(),
    hasPrev: true, hasNext: true, ...over,
  }
  const view = renderHook(() => useLightboxKeys(handlers))
  return { ...handlers, ...view }
}

const press = (key, target = document.body) => fireEvent.keyDown(target, { key })

describe('useLightboxKeys', () => {
  describe('moving through the photographs', () => {
    it('goes back on the left arrow', () => {
      const s = setup()
      press('ArrowLeft')
      expect(s.onPrev).toHaveBeenCalled()
    })

    it('goes on with the right arrow', () => {
      const s = setup()
      press('ArrowRight')
      expect(s.onNext).toHaveBeenCalled()
    })

    it('closes on Escape', () => {
      const s = setup()
      press('Escape')
      expect(s.onClose).toHaveBeenCalled()
    })

    it('ignores any other key', () => {
      const s = setup()
      press('a')
      expect(s.onPrev).not.toHaveBeenCalled()
      expect(s.onNext).not.toHaveBeenCalled()
      expect(s.onClose).not.toHaveBeenCalled()
    })
  })

  describe('at either end of the run', () => {
    it('does not go back past the first', () => {
      const s = setup({ hasPrev: false })
      press('ArrowLeft')
      expect(s.onPrev).not.toHaveBeenCalled()
    })

    it('does not go on past the last', () => {
      const s = setup({ hasNext: false })
      press('ArrowRight')
      expect(s.onNext).not.toHaveBeenCalled()
    })
  })

  describe('while somebody is typing', () => {
    // The panel behind the photograph holds a description box, a date field
    // and a person search. An arrow key there should move the cursor.
    beforeEach(() => { document.body.innerHTML = '' })

    it.each([
      ['an input', '<input />'],
      ['a textarea', '<textarea></textarea>'],
      ['a select', '<select></select>'],
      ['anything editable', '<div contenteditable="true"></div>'],
    ])('leaves the photograph alone in %s', (_, html) => {
      const s = setup()
      document.body.innerHTML = html
      const field = document.body.firstElementChild
      press('ArrowLeft', field)
      press('ArrowRight', field)
      press('Escape', field)
      expect(s.onPrev).not.toHaveBeenCalled()
      expect(s.onNext).not.toHaveBeenCalled()
      expect(s.onClose).not.toHaveBeenCalled()
    })

    it('still works on something that cannot be typed into', () => {
      const s = setup()
      document.body.innerHTML = '<button></button>'
      press('Escape', document.body.firstElementChild)
      expect(s.onClose).toHaveBeenCalled()
    })
  })

  describe('once the photograph is closed', () => {
    it('stops listening', () => {
      const s = setup()
      s.unmount()
      press('Escape')
      expect(s.onClose).not.toHaveBeenCalled()
    })
  })

  describe('when a handler is not given', () => {
    it('does not blow up', () => {
      renderHook(() => useLightboxKeys({ hasPrev: true, hasNext: true }))
      expect(() => { press('ArrowLeft'); press('ArrowRight'); press('Escape') }).not.toThrow()
    })
  })
})
