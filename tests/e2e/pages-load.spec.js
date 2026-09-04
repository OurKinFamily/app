import { test, expect } from '@playwright/test'

// Smoke flow: every page in the rail mounts without erroring and names itself
// in an h1. Read-only — no clicks past navigation.
//
// No waiting on networkidle: the map streams tiles for as long as it is open,
// so a page with a map on it never goes quiet and the wait just runs out.

test.describe('Top-level pages load', () => {
  // Each entry is `[route, heading]`. Every page says what it is in an h1, so
  // there is nothing to anchor on but the words a person actually reads.
  const pages = [
    ['/', 'Gallery'],
    ['/people', 'People'],
    ['/albums', 'Albums'],
    ['/favorites', 'Favourites'],
    ['/family', 'Family'],
    ['/places', 'Places'],
    ['/biographies', 'Biographies'],
  ]

  for (const [route, heading] of pages) {
    test(`${route} loads`, async ({ page }) => {
      await page.goto(route)
      await expect(
        page.getByRole('heading', { name: heading, level: 1 })
      ).toBeVisible({ timeout: 15_000 })
      await expect(page.locator('main')).toBeVisible()
    })
  }
})

// The app used to live under /gallery and /manage, and the reskin under /v2.
// Those paths are in bookmarks, in browser history, and in two years of
// notes, so they have to keep landing somewhere sensible.
test.describe('Old paths still land', () => {
  const moved = [
    ['/gallery', '/'],
    ['/gallery/people', '/people'],
    ['/gallery/favorites', '/favorites'],
    ['/manage/people', '/people'],
    ['/manage/groups', '/groups'],
    ['/admin/filesystem', '/admin/analytics'],
    ['/v2', '/'],
    ['/v2/people', '/people'],
    ['/v2/admin/health', '/admin/health'],
  ]

  for (const [from, to] of moved) {
    test(`${from} lands on ${to}`, async ({ page }) => {
      await page.goto(from)
      await page.waitForURL(
        url => new URL(url).pathname === to,
        { timeout: 15_000 },
      )
    })
  }

  // The catch-all has to carry the rest of the path across, not just the
  // first segment: a person bookmarked mid-tab should land mid-tab.
  test('a deep old person link keeps its tab', async ({ page }) => {
    await page.goto('/people')
    await page.waitForLoadState('networkidle')
    const first = page.getByTestId('person-card').first()
    await first.click()
    await page.waitForURL(/\/people\/[a-z0-9-]+/, { timeout: 15_000 })

    const id = new URL(page.url()).pathname.split('/')[2]
    await page.goto(`/manage/people/${id}/timeline`)
    await page.waitForURL(`**/people/${id}/timeline`, { timeout: 15_000 })
  })
})
