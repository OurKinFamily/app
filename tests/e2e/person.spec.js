import { test, expect } from '@playwright/test'

// Read-only flow: header user-link → person overview → scroll the gallery
// → click each tab. Depends on the local API at :8000 and on Stephen
// existing as the DEV_USER_EMAIL (default).

test.describe('Person page flow', () => {
  test('header user link navigates to the person overview page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/gallery/)

    // AppHeader fetches /api/admin/me and renders the user's known_as.
    const userLink = page.getByRole('link', { name: 'Stephen' })
    await expect(userLink).toBeVisible({ timeout: 15_000 })
    await userLink.click()

    await expect(page).toHaveURL(/\/manage\/people\/[a-z0-9-]+\/overview/)
    // Hero heading shows the person's display name.
    await expect(page.getByRole('heading', { name: /Stephen/, level: 1 })).toBeVisible()
  })

  test('overview tab loads more gallery items as the user scrolls', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Stephen' }).click()
    await expect(page).toHaveURL(/\/overview$/)

    const items = page.getByTestId('gallery-item')
    await expect(items.first()).toBeVisible({ timeout: 15_000 })
    const initialCount = await items.count()

    // Scroll the page to the bottom a couple of times — useGallery should
    // trigger loadOlder and append more items.
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(800)
    }

    const grownCount = await items.count()
    expect(grownCount).toBeGreaterThan(initialCount)
  })

  test.describe('tab navigation', () => {
    const tabs = [
      ['Circles',   /\/circles$/],
      ['Timeline',  /\/timeline$/],
      ['Ancestry',  /\/ancestry$/],
      ['Scrapbook', /\/scrapbook$/],
      ['Travel',    /\/travel$/],
      ['AI',        /\/ai$/],
    ]

    for (const [label, pattern] of tabs) {
      test(`navigates to ${label} tab and renders content`, async ({ page }) => {
        await page.goto('/')
        await page.getByRole('link', { name: 'Stephen' }).click()
        await expect(page).toHaveURL(/\/overview$/)

        // Click the tab nav link, scoped to <main> so the sidebar's
        // duplicate labels don't match.
        const main = page.locator('main')
        await main.getByRole('link', { name: label, exact: true }).click()

        await expect(page).toHaveURL(pattern)
        // Wait for the tab's data fetches to settle before asserting
        // anything about its content.
        await page.waitForLoadState('networkidle')

        // Tab nav row stays — that link is the persistent fixture across
        // every tab. The tab's content renders below it inside <main>.
        await expect(main.getByRole('link', { name: label, exact: true })).toBeVisible()
        // No global "Loading…" left after the tab settled.
        await expect(main.getByText('Loading…')).not.toBeVisible({ timeout: 5_000 })
      })
    }
  })
})
