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

test('clicking a gallery item opens the lightbox with the photo + detail panel', async ({ page }) => {
  await page.goto('/')

  const firstItem = page.getByTestId('gallery-item').first()
  await expect(firstItem).toBeVisible({ timeout: 15_000 })

  // The Media tile inside each gallery-item is a button (because onSelect
  // is set). Click that to open the lightbox.
  await firstItem.locator('button').first().click()

  await expect(page).toHaveURL(/\/gallery\/photo\//)

  // Lightbox: image visible + the position counter ("1 / N") + the global
  // Close action chrome rendered.
  await expect(page.locator('img').first()).toBeVisible({ timeout: 15_000 })
  // There are 2 "Close"-labeled buttons in the tree (lightbox + drawer);
  // .first() pins to the lightbox one rendered higher in the DOM.
  await expect(page.getByRole('button', { name: 'Close' }).first()).toBeVisible()
  await expect(page.locator('text=/^\\d+ \\/ \\d+$/').first()).toBeVisible()
})
