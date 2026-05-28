import { test, expect } from '@playwright/test'

// Visual regression baseline for the gallery landing view.
//
// Heads up:
// - First run writes the baseline PNG into
//   `tests/e2e/visual/gallery.spec.js-snapshots/`. Commit that file so
//   subsequent runs have something to diff against.
// - Baseline is tied to whatever photos are in the local archive at
//   capture time. A new import that changes the first row will fail this
//   test until you re-baseline with `npx playwright test --update-snapshots`.
// - Animations / scrollbars / font rendering can cause sub-pixel diffs.
//   `animations: 'disabled'` + a modest `maxDiffPixelRatio` keeps the
//   suite from being noisy.
test('gallery on first load matches the baseline', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/gallery/)

  // Wait for the first batch of images to load — both the testid hook
  // appearing AND networkidle settle the initial fetch + decode.
  await expect(page.getByTestId('gallery-item').first()).toBeVisible({ timeout: 15_000 })
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveScreenshot('gallery-landing.png', {
    fullPage:           false,
    animations:         'disabled',
    maxDiffPixelRatio:  0.02,
  })
})
