import { test, expect } from '@playwright/test'

/**
 * A video in the lightbox was taller than the pane that holds it.
 *
 * `maxHeight: '100%'` only bounds anything when the containing block has a
 * definite height. DetailVideo used to wrap its <video> in a plain div, which
 * is a grid item of the detail pane with no height of its own -- so the div
 * took its height from the video, the percentage resolved to `none`, and the
 * clip rendered at intrinsic size. Web proxies are capped at 1080px tall and
 * the pane is 100dvh minus 32px of padding, so on a 1080p display the picture
 * lost about 16px off the top and the bottom. Just enough to be obvious and
 * not quite enough to be sure about.
 *
 * The unit tests assert the structure. This asserts the pixels, which is the
 * only place the bug was ever visible: jsdom does no layout.
 *
 * Read-only, like the rest of the e2e suite. Needs the api at :8000.
 */
const ALBUM = '17732e7c-8cef-458b-ba5a-4f997f5bfc09'
// A portrait Live Photo clip, 640x854. Deep-linked rather than clicked: the
// lightbox has its own address, and this is also the path that renders the
// is_video fallback in AlbumPage.
const CLIP = 'archive/2025/08/2025-08-24_13-29-16_001.mov'

test.describe('a video opened in the lightbox', () => {
  // Deliberately shorter than the 1080-tall proxies, so the video is forced to
  // scale down rather than happening to fit. A viewport taller than every clip
  // in the archive would pass whether or not the fix is in place.
  test.use({ viewport: { width: 1280, height: 600 } })

  test('fits inside its pane instead of being clipped', async ({ page }) => {
    await page.goto(`/albums/${ALBUM}/photo/${CLIP}`)

    const video = page.locator('video')
    await expect(video).toBeVisible({ timeout: 20_000 })

    // Wait for metadata: before it arrives a <video> reports the spec's
    // default 300x150 placeholder, which fits anything and would pass even
    // with the bug in place.
    await page.waitForFunction(
      () => document.querySelector('video')?.videoHeight > 0,
      null,
      { timeout: 20_000 },
    )

    const fits = await page.evaluate(() => {
      const v = document.querySelector('video')
      const r = v.getBoundingClientRect()
      // Measured against the viewport, not against an ancestor. The bug WAS an
      // ancestor that hugged the video, so any ancestor-relative measurement
      // reports a perfect fit while the picture is visibly cut in half. The
      // lightbox is `position: fixed; inset: 0` at 100dvh, so the viewport is
      // the box the picture has to live inside, and it is the box the clipping
      // actually happened at.
      return {
        videoH: r.height, videoW: r.width,
        viewportH: window.innerHeight, viewportW: window.innerWidth,
        clippedTop: -r.top,
        clippedBottom: r.bottom - window.innerHeight,
        clippedLeft: -r.left,
        clippedRight: r.right - window.innerWidth,
        intrinsic: [v.videoWidth, v.videoHeight],
      }
    })

    const where = JSON.stringify(fits)

    // One pixel of slack for subpixel rounding. With the wrapper in place this
    // clip measured top -127 / bottom +127 in a 600px viewport.
    expect(fits.clippedTop, where).toBeLessThanOrEqual(1)
    expect(fits.clippedBottom, where).toBeLessThanOrEqual(1)
    expect(fits.clippedLeft, where).toBeLessThanOrEqual(1)
    expect(fits.clippedRight, where).toBeLessThanOrEqual(1)

    // Scaled down to fit, not merely small. The viewport is deliberately
    // shorter than the clip's natural size, so a video rendered at anything
    // like its intrinsic height fails here.
    expect(fits.videoH, where).toBeLessThanOrEqual(fits.viewportH)
    expect(fits.videoH, where).toBeGreaterThan(0)
    expect(fits.intrinsic[1], where).toBeGreaterThan(fits.viewportH)
  })
})
