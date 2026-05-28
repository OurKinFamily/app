import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MediaLightboxSheet } from '../../../src/components/MediaLightboxSheet'

function fireTouch(el, type, clientY) {
  const event = new Event(type, { bubbles: true })
  const touch = { clientY }
  event.touches        = type === 'touchstart' ? [touch] : []
  event.changedTouches = type === 'touchend'   ? [touch] : []
  fireEvent(el, event)
}

function renderSheet(props = {}) {
  const setOpen = vi.fn()
  const utils   = render(
    <MediaLightboxSheet open={false} setOpen={setOpen} {...props}>
      <span data-testid="body">body</span>
    </MediaLightboxSheet>
  )
  return { ...utils, setOpen }
}

describe('MediaLightboxSheet', () => {
  describe('rendering', () => {
    it('renders its children', () => {
      renderSheet()
      expect(screen.getByTestId('body')).toBeInTheDocument()
    })
    it('labels the toggle button per the open state', () => {
      const { rerender } = render(
        <MediaLightboxSheet open={false} setOpen={() => {}}><span /></MediaLightboxSheet>
      )
      expect(screen.getByRole('button', { name: 'Expand details' })).toBeInTheDocument()
      rerender(<MediaLightboxSheet open setOpen={() => {}}><span /></MediaLightboxSheet>)
      expect(screen.getByRole('button', { name: 'Collapse details' })).toBeInTheDocument()
    })
  })

  describe('toggle button', () => {
    it('toggles open state on click', () => {
      const { setOpen } = renderSheet()
      screen.getByRole('button', { name: /details/ }).click()
      expect(setOpen).toHaveBeenCalledTimes(1)
      // The new value is a function (setOpen(o => !o)).
      const updater = setOpen.mock.calls[0][0]
      expect(typeof updater).toBe('function')
      expect(updater(false)).toBe(true)
      expect(updater(true)).toBe(false)
    })
  })

  describe('swipe gestures', () => {
    it('opens when the user swipes up past 40px while closed', () => {
      const { setOpen } = renderSheet()
      const btn = screen.getByRole('button', { name: /details/ })
      fireTouch(btn, 'touchstart', 200)
      fireTouch(btn, 'touchend',   100)  // dy = -100, < -40 → open
      expect(setOpen).toHaveBeenCalledWith(true)
    })
    it('closes when the user swipes down past 40px while open', () => {
      const setOpen = vi.fn()
      render(
        <MediaLightboxSheet open setOpen={setOpen}><span>x</span></MediaLightboxSheet>
      )
      const btn = screen.getByRole('button', { name: /details/ })
      fireTouch(btn, 'touchstart', 100)
      fireTouch(btn, 'touchend',   200)  // dy = +100, > +40 → close
      expect(setOpen).toHaveBeenCalledWith(false)
    })
    it('ignores small swipes that do not cross the threshold', () => {
      const { setOpen } = renderSheet()
      const btn = screen.getByRole('button', { name: /details/ })
      fireTouch(btn, 'touchstart', 100)
      fireTouch(btn, 'touchend',   110)  // dy = +10, below threshold
      expect(setOpen).not.toHaveBeenCalled()
    })
    it('ignores touchend with no preceding touchstart', () => {
      const { setOpen } = renderSheet()
      const btn = screen.getByRole('button', { name: /details/ })
      fireTouch(btn, 'touchend', 200)
      expect(setOpen).not.toHaveBeenCalled()
    })
  })
})
