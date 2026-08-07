import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function addPlayer(page: Page, name: string): Promise<void> {
  await page.getByLabel('Nombre del jugador').fill(name)
  await page.getByRole('button', { name: 'Añadir' }).click()
}

async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include('.player-groups')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
}

test.describe('player groups accessibility', () => {
  test('has no detectable violations in empty and populated states', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Jugadores' })).toBeVisible()
    await expectAccessible(page)

    await addPlayer(page, 'Ana')
    await addPlayer(page, 'Bruno')
    await addPlayer(page, 'Carla')
    await expectAccessible(page)
  })

  test('keeps the work surface inside the mobile viewport', async ({ page }) => {
    await page.goto('/')
    for (const name of ['Alejandra', 'Bartolomé', 'Constanza', 'Domingo']) {
      await addPlayer(page, name)
    }
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }))
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
  })
})
