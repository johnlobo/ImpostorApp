import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function openRoleAssignment(
  page: Page,
  names: readonly string[] = ['Ana', 'Bruno', 'Carla'],
): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Jugadores' })).toBeVisible()
  for (const name of names) {
    await page.getByLabel('Nombre del jugador').fill(name)
    await page.getByRole('button', { name: 'Añadir' }).click()
  }
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Revisar configuración' }).click()
  await page.getByRole('button', { name: 'Confirmar partida' }).click()
  await expect(page.getByRole('heading', { name: 'Elige las categorías' })).toBeVisible()
  await page.getByRole('button', { name: 'Revisar selección' }).click()
  await page.getByRole('button', { name: 'Confirmar contenido' }).click()
  await expect(page.getByRole('heading', { name: 'Reparte los roles' })).toBeVisible({
    timeout: 15_000,
  })
}

function playerButton(page: Page, name: string) {
  return page.getByRole('button', { name: new RegExp(`^${name}`) })
}

async function expectAccessible(page: Page, selector: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include(selector)
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

test.describe('secret role assignment accessibility', () => {
  test('has no detectable violations on shared, covered, revealed and ready surfaces', async ({
    page,
  }) => {
    await openRoleAssignment(page)
    await expectAccessible(page, '.secret-role-screen')

    await playerButton(page, 'Ana').click()
    await expect(page.getByRole('button', { name: 'Pulsa para ver el concepto' })).toBeFocused()
    await expectAccessible(page, '.private-role-screen')

    await page.getByRole('button', { name: 'Pulsa para ver el concepto' }).click()
    await expect(page.getByRole('button', { name: 'Ocultar y devolver el móvil' })).toBeFocused()
    await expectAccessible(page, '.private-role-screen')
    await page.getByRole('button', { name: 'Ocultar y devolver el móvil' }).click()

    for (const name of ['Bruno', 'Carla']) {
      await playerButton(page, name).click()
      await page.getByRole('button', { name: 'Pulsa para ver el concepto' }).click()
      await page.getByRole('button', { name: 'Ocultar y devolver el móvil' }).click()
    }
    await expect(page.getByRole('button', { name: 'Empezar ronda' })).toBeEnabled()
    await expectAccessible(page, '.secret-role-screen')
  })

  test('supports the complete private handoff using only the keyboard', async ({ page }) => {
    await openRoleAssignment(page)
    const ana = playerButton(page, 'Ana')
    await ana.focus()
    await page.keyboard.press('Enter')

    const curtain = page.getByRole('button', { name: 'Pulsa para ver el concepto' })
    await expect(curtain).toBeFocused()
    await page.keyboard.press('Enter')

    const conceal = page.getByRole('button', { name: 'Ocultar y devolver el móvil' })
    await expect(conceal).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(ana).toBeDisabled()
    await expect(page.getByLabel('Progreso de revelación')).toHaveText('1 de 3')
    await expect(page.getByLabel('Lista compartida de revelación')).not.toContainText('IMPOSTOR')
  })

  test('keeps every reveal state inside a 320px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await openRoleAssignment(page, [
      'Alejandra de las Nieves',
      'Maximiliano Fernández',
      'Guillermo del Valle',
    ])
    await expectNoHorizontalOverflow(page)

    await playerButton(page, 'Alejandra de las Nieves').click()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Pulsa para ver el concepto' }).click()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Ocultar y devolver el móvil' }).click()
    await expectNoHorizontalOverflow(page)
  })
})
