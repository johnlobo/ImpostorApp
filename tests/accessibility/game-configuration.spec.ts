import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function openConfiguration(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Jugadores' })).toBeVisible()
  for (const name of ['Ana', 'Bruno', 'Carla']) {
    await page.getByLabel('Nombre del jugador').fill(name)
    await page.getByRole('button', { name: 'Añadir' }).click()
  }
  await page.getByRole('button', { name: 'Continuar' }).click()
}

test.describe('game configuration accessibility', () => {
  test('has no detectable violations while editing and reviewing', async ({ page }) => {
    await openConfiguration(page)
    let results = await new AxeBuilder({ page })
      .include('.game-configuration')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
    await page.getByRole('button', { name: 'Revisar configuración' }).click()
    results = await new AxeBuilder({ page })
      .include('.game-configuration')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('stays inside the mobile viewport', async ({ page }) => {
    await openConfiguration(page)
    await page.getByLabel('Con temporizador').check()
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }))
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
  })
})
