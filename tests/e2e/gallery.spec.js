import { test, expect } from '@playwright/test'

// Smoke test: app loads at `/` (redirects to `/gallery`) and the gallery
// renders ≥ 1 gallery-item. Selectors target stable data-testid hooks so
// the test isn't sensitive to incidental DOM (e.g. avatar images in the
// header).
test('home loads and the gallery renders at least one item', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/gallery/)

  const gallery = page.getByTestId('gallery')
  await expect(gallery).toBeVisible({ timeout: 15_000 })

  const items = gallery.getByTestId('gallery-item')
  await expect(items.first()).toBeVisible({ timeout: 15_000 })
  expect(await items.count()).toBeGreaterThan(0)
})
