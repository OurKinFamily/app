import { test, expect } from '@playwright/test'

// Read-only flow: People list (/gallery/people) → click a person card →
// land on /manage/people/<id>/overview. Depends on real data in the
// archive — Stephen exists as DEV_USER_EMAIL.

test.describe('People list flow', () => {
  test('renders the people list with the People heading', async ({ page }) => {
    await page.goto('/gallery/people')
    await expect(page.getByRole('heading', { name: 'People', level: 1 })).toBeVisible({ timeout: 15_000 })
  })

  test('clicking a person card navigates to that person\'s overview', async ({ page }) => {
    await page.goto('/gallery/people')
    await expect(page.getByRole('heading', { name: 'People', level: 1 })).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // Each EntityItem renders as <button>. PeoplePage's toolbar also has
    // a "+ Add person" button — filter that out so the first match is a
    // real person card.
    const cards = page.locator('main button').filter({ hasNotText: 'Add person' })
    await expect(cards.first()).toBeVisible()
    await cards.first().click()

    await expect(page).toHaveURL(/\/manage\/people\/[a-z0-9-]+/)
    // Person hero <h1> renders the display name.
    await expect(page.locator('main h1').first()).toBeVisible()
  })
})
