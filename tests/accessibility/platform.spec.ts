import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include('.app-shell')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()

  expect(results.violations).toEqual([])
}

test.describe('platform shell accessibility', () => {
  test('has no detectable violations when the platform is ready', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('offline-status')).toHaveAttribute(
      'data-state',
      'offline-ready',
      { timeout: 15_000 },
    )

    await expectNoAccessibilityViolations(page)
  })

  test('keeps the first-load recovery state accessible', async ({ context, page }) => {
    await context.route('**/sw.js', (route) => route.abort('connectionfailed'))
    await page.goto('/')
    await expect(page.getByTestId('offline-status')).toHaveAttribute(
      'data-state',
      'online-not-ready',
    )
    await expect(page.getByTestId('offline-retry')).toBeEnabled()

    await expectNoAccessibilityViolations(page)
  })

  test('keeps installation guidance accessible inside the application shell', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Ayuda' }).click()
    await expect(page.getByTestId('install-help')).toBeVisible()

    await expectNoAccessibilityViolations(page)
  })
})
