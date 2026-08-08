import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const names = ['Alejandra de las Nieves', 'Maximiliano Fernández', 'Guillermo del Valle'] as const

async function openRound(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Jugadores' })).toBeVisible()
  for (const name of names) {
    await page.getByLabel('Nombre del jugador').fill(name)
    await page.getByRole('button', { name: 'Añadir' }).click()
  }
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Revisar configuración' }).click()
  await page.getByRole('button', { name: 'Confirmar partida' }).click()
  await page.getByRole('button', { name: 'Revisar selección' }).click()
  await page.getByRole('button', { name: 'Confirmar contenido' }).click()
  for (const name of names) {
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
    await page.getByRole('button', { name: 'Pulsa para ver el concepto' }).click()
    await page.getByRole('button', { name: 'Ocultar y devolver el móvil' }).click()
  }
  await page.getByRole('button', { name: 'Empezar ronda' }).click()
  await expect(page.getByLabel('Fase compartida de pistas')).toBeVisible({ timeout: 15_000 })
}

async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include('.round-session-screen')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
}

test.describe('round session accessibility', () => {
  test('keeps ready, clues, discussion and confirmation accessible', async ({ page }) => {
    await openRound(page)
    await expectAccessible(page)
    await page.getByRole('button', { name: 'Comenzar pistas' }).focus()
    await page.keyboard.press('Enter')
    await expectAccessible(page)

    for (let index = 0; index < names.length; index += 1) {
      const next = page.getByRole('button', { name: 'Siguiente jugador' })
      await expect(next).toBeEnabled()
      await next.focus()
      await page.keyboard.press('Enter')
      if (index < names.length - 1) {
        await expect(page.getByLabel('Fase compartida de pistas')).toContainText(names[index + 1]!)
      } else {
        await expect(page.getByLabel('Fase compartida de pistas')).toContainText(
          'Conversación general',
        )
      }
    }
    await expectAccessible(page)

    const close = page.getByRole('button', { name: 'Terminar pistas' })
    await close.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Confirmar y continuar' })).toBeFocused()
    await expectAccessible(page)
    await page.keyboard.press('Escape')
    await expect(close).toBeFocused()
  })

  test('does not overflow at 320px with maximum-length names', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await openRound(page)
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Comenzar pistas' }).click()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Siguiente jugador' }).click()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Siguiente jugador' }).click()
    await page.getByRole('button', { name: 'Siguiente jugador' }).click()
    await page.getByRole('button', { name: 'Terminar pistas' }).click()
    await expectNoHorizontalOverflow(page)
  })
})
