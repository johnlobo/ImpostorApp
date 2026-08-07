import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const installHelp = (page: Page) => page.getByTestId('install-help')

async function openInstallHelp(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ayuda' }).click()
  await expect(page.getByRole('heading', { name: 'Cómo instalar' })).toBeVisible()
  await expect(installHelp(page)).toBeVisible()
}

test.describe('installation help accessibility', () => {
  test('has no automatically detectable accessibility violations', async ({ page }) => {
    await openInstallHelp(page)

    const results = await new AxeBuilder({ page })
      .include('[data-testid="install-help"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('keeps installation guidance usable in a narrow portrait viewport', async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 653 })
    await openInstallHelp(page)

    const geometry = await page.evaluate(() => {
      const help = document.querySelector<HTMLElement>('[data-testid="install-help"]')
      const interactiveElements =
        help?.querySelectorAll<HTMLElement>('a, button, input, select') ?? []

      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        helpWidth: help?.getBoundingClientRect().width ?? 0,
        clippedControls: Array.from(interactiveElements).filter((element) => {
          const { left, right } = element.getBoundingClientRect()
          return left < 0 || right > document.documentElement.clientWidth
        }).length,
      }
    })

    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.helpWidth).toBeGreaterThan(0)
    expect(geometry.helpWidth).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.clippedControls).toBe(0)
  })
})
