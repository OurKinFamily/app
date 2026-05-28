import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useEscToClose } from '../../../src/lib/hooks'

describe('useEscToClose', () => {
  let onClose
  beforeEach(() => { onClose = vi.fn() })

  function press(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }))
  }

  describe('when Escape is pressed', () => {
    it('invokes onClose', () => {
      renderHook(() => useEscToClose(onClose))
      press('Escape')
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('when any other key is pressed', () => {
    it.each(['Enter', 'a', 'ArrowLeft', ' '])('ignores %s', key => {
      renderHook(() => useEscToClose(onClose))
      press(key)
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('detaches the listener on unmount', () => {
      const { unmount } = renderHook(() => useEscToClose(onClose))
      unmount()
      press('Escape')
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
