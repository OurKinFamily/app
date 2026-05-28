import { test, expect } from '@playwright/test'

// Read-only flow: Family page (/gallery/family) — renders heading,
// ridgeline rows, and the two controls (min-photos + row-limit selects).
// Depends on real data: at least one person with ≥ 30 photos in the DB.

test.describe('Family page', () => {
  test('renders heading + ridgeline rows + controls', async ({ page }) => {
    await page.goto('/gallery/family')
    await expect(page.getByRole('heading', { name: 'Family', level: 1 })).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    // Controls: two <select>s (min-photos + row-limit)
    const selects = page.locator('main select')
    await expect(selects).toHaveCount(2)

    // At least one ridge row exists (each row is a <button title="... photos ...">)
    const rows = page.locator('main button[title*="photos"]')
    await expect(rows.first()).toBeVisible({ timeout: 15_000 })
  })

  test('clicking a ridge row navigates to the person page', async ({ page }) => {
    await page.goto('/gallery/family')
    await expect(page.getByRole('heading', { name: 'Family', level: 1 })).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle')

    const rows = page.locator('main button[title*="photos"]')
    await expect(rows.first()).toBeVisible()
    await rows.first().click()

    await expect(page).toHaveURL(/\/manage\/people\/[a-z0-9-]+/)
  })
})
