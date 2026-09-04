import { test, expect } from '@playwright/test'

// Smoke test: the app loads at `/` and the gallery renders at least one
// item. Selectors target stable data-testid hooks so the test isn't sensitive
// to incidental DOM (e.g. avatar images in the header).
test('home loads and the gallery renders at least one item', async ({ page }) => {
  await page.goto('/')

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

  // The photograph itself is the button; the controls that appear on hover
  // are separate ones inside the same tile.
  await firstItem.locator('button').first().click()

  // Opening a photograph gives it its own address, so it can be linked to.
  await expect(page).toHaveURL(/\/photo\//)

  await expect(page.locator('img').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: 'Close' }).first()).toBeVisible()
})
