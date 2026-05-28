import { test, expect } from '@playwright/test'

// Smoke flow: every top-nav page mounts without erroring + its expected
// heading renders. Read-only — no clicks past nav.

test.describe('Top-level pages load', () => {
  // Each entry is `[route, markerKind, markerValue]`. markerKind tells the
  // test what to wait for: 'testid' for testid-anchored, 'heading' for an
  // h1, 'main' when the page has no heading (e.g. PlacesPage is a full-
  // bleed map and just renders <PhotoMap/>).
  const pages = [
    ['/gallery',           'testid',  'gallery'],
    ['/gallery/people',    'heading', 'People'],
    ['/gallery/albums',    'heading', 'Albums'],
    ['/gallery/favorites', 'heading', 'Favorites'],
    ['/gallery/family',    'heading', 'Family'],
    ['/gallery/places',    'main',    null],
  ]

  for (const [route, kind, marker] of pages) {
    test(`${route} loads`, async ({ page }) => {
      await page.goto(route)
      if (kind === 'testid') {
        await expect(page.getByTestId(marker)).toBeVisible({ timeout: 15_000 })
      } else if (kind === 'heading') {
        await expect(
          page.getByRole('heading', { name: marker, level: 1 })
        ).toBeVisible({ timeout: 15_000 })
      } else {
        await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
      }
      await page.waitForLoadState('networkidle')
      await expect(page.locator('main')).toBeVisible()
    })
  }
})
