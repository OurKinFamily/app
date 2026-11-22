import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DetailVideo } from '../../../src/ui/DetailVideo'

/**
 * The regression this guards: a video the browser cannot decode used to render
 * an empty rectangle and say nothing. iPhone Live Photo clips (H.264 picture,
 * PCM audio that Chromium's demuxer refuses) were in that state for months,
 * and the only report anybody could make was "it doesn't show anything".
 */

const setup = (props = {}) =>
  render(
    <DetailVideo
      src="/api/media/archive/2025/08/clip.mov?v=1"
      poster="/api/media/thumb/2025/08/clip.mov.poster.jpg?v=1"
      {...props}
    />,
  )

const videoEl = () => document.querySelector('video')

/**
 * The second regression: a tall video was clipped at top and bottom.
 *
 * `maxHeight: '100%'` only constrains anything if its containing block has a
 * definite height. This component used to wrap its <video> in a plain div,
 * which is a grid item of the detail pane with no height of its own, so the
 * div's height came from the video and the percentage resolved to `none`. A
 * portrait phone clip then rendered at its intrinsic height and the pane --
 * which centres its content -- cut off both ends.
 *
 * jsdom does no layout, so these assert the structure that made the overflow
 * possible rather than the pixels: the <video> must sit directly in the grid,
 * exactly as MediaDetail's <img> branch does, with nothing auto-height in
 * between.
 */
const inFlowChildren = container =>
  [...container.children].filter(el => el.style.position !== 'absolute')

describe('DetailVideo', () => {
  it('renders a video at the given src', () => {
    setup()
    expect(videoEl()).toHaveAttribute('src', '/api/media/archive/2025/08/clip.mov?v=1')
  })

  it('shows the poster frame while the video has not started', () => {
    setup()
    expect(videoEl()).toHaveAttribute(
      'poster',
      '/api/media/thumb/2025/08/clip.mov.poster.jpg?v=1',
    )
  })

  it('leaves the controls on, so a clip can be scrubbed', () => {
    setup()
    expect(videoEl()).toHaveAttribute('controls')
  })

  describe('when the browser can play the file', () => {
    it('says nothing', () => {
      setup()
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  describe('when the browser cannot decode the file', () => {
    it('says so rather than showing an empty rectangle', () => {
      setup()
      fireEvent.error(videoEl())
      expect(screen.getByRole('alert')).toHaveTextContent(/won't play in the browser/i)
    })

    it("makes clear the archived file itself is not damaged", () => {
      setup()
      fireEvent.error(videoEl())
      expect(screen.getByRole('alert')).toHaveTextContent(/file itself is fine/i)
    })

    it('clears the message when moving to a different video', () => {
      const { rerender } = setup()
      fireEvent.error(videoEl())
      expect(screen.getByRole('alert')).toBeInTheDocument()

      rerender(<DetailVideo src="/api/media/archive/2025/08/other.mov?v=1" poster="p.jpg" />)
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  describe('fitting inside the detail pane', () => {
    it('puts the video directly in the grid, with no wrapper to size it', () => {
      const { container } = setup()
      expect(inFlowChildren(container)[0].tagName).toBe('VIDEO')
    })

    it('adds exactly one element to the layout', () => {
      /* More than one in-flow child would make the pane's grid lay out rows,
         which is the other way to lose the bottom of the picture. */
      const { container } = setup()
      expect(inFlowChildren(container)).toHaveLength(1)
    })

    it('still adds only one once the failure message is showing', () => {
      const { container } = setup()
      fireEvent.error(videoEl())
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(inFlowChildren(container)).toHaveLength(1)
    })

    it('asks to be bounded by the pane in both directions', () => {
      setup()
      expect(videoEl().style.maxHeight).toBe('100%')
      expect(videoEl().style.maxWidth).toBe('100%')
    })

    it('lets the grid item shrink below the intrinsic size', () => {
      /* A grid item's min-height is auto, which refuses to go below the
         content. Without this the fitted box is ignored anyway. */
      setup()
      expect(videoEl().style.minHeight).toBe('0px')
    })

    it('letterboxes rather than stretches, like the photograph branch', () => {
      setup()
      expect(videoEl().style.objectFit).toBe('contain')
    })
  })

  describe('with a caption track', () => {
    it('attaches it to the video', () => {
      setup({ captions: { src: '/api/media/vtt/clip.mov', kind: 'captions', srcLang: 'en' } })
      expect(document.querySelector('track')).toHaveAttribute('src', '/api/media/vtt/clip.mov')
    })
  })

  describe('without a caption track', () => {
    it('attaches none', () => {
      setup({ captions: null })
      expect(document.querySelector('track')).toBeNull()
    })
  })
})
