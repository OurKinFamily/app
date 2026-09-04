import { test, expect } from '@playwright/test'

// Read-only flow: People list (/people) → click a person card →
// land on /people/<id>/overview. Depends on real data in the
// archive — Stephen exists as DEV_USER_EMAIL.

test.describe('People list flow', () => {
  test('renders the people list with the People heading', async ({ page }) => {
    await page.goto('/people')
    await expect(page.getByRole('heading', { name: 'People', level: 1 })).toBeVisible({ timeout: 15_000 })
  })

  test('clicking a person card navigates to that person\'s overview', async ({ page }) => {
    await page.goto('/people')
    await expect(page.getByRole('heading', { name: 'People', level: 1 })).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // By testid, not "the first button in main": the view toggles in the
    // toolbar are buttons too, and they sit higher up the page.
    const cards = page.getByTestId('person-card')
    await expect(cards.first()).toBeVisible()
    await cards.first().click()

    await expect(page).toHaveURL(/\/people\/[a-z0-9-]+/)
    // Person hero <h1> renders the display name.
    await expect(page.locator('main h1').first()).toBeVisible()
  })
})
