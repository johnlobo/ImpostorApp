import { expect, test, type Page } from '@playwright/test'

async function addPlayer(page: Page, name: string): Promise<void> {
  await page.getByLabel('Nombre del jugador').fill(name)
  await page.getByRole('button', { name: 'Añadir' }).click()
}

test.describe('player and saved-group management', () => {
  test('validates, reorders, removes, and prepares a roster', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Los datos locales están preparados.')).toBeVisible({
      timeout: 15_000,
    })

    await addPlayer(page, 'Ana')
    await addPlayer(page, 'Bruno')
    await addPlayer(page, 'Carla')
    await addPlayer(page, ' ana ')
    await expect(page.getByText('Cada jugador debe tener un nombre diferente.')).toBeVisible()

    await page.getByRole('button', { name: 'Subir a Carla' }).click()
    const names = page.locator('.player-row input')
    await expect(names.nth(0)).toHaveValue('Ana')
    await expect(names.nth(1)).toHaveValue('Carla')
    await expect(names.nth(2)).toHaveValue('Bruno')

    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Lista preparada con 3 jugadores.')).toBeVisible()

    await page.getByRole('button', { name: 'Eliminar a Bruno' }).click()
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  test('persists and reloads a saved group offline', async ({ browserName, context, page }) => {
    test.skip(browserName !== 'chromium', 'Offline service-worker cycle targets Chromium')

    await page.goto('/')
    await expect(page.getByText('Los datos locales están preparados.')).toBeVisible({
      timeout: 15_000,
    })
    await addPlayer(page, 'Ana')
    await addPlayer(page, 'Bruno')
    await addPlayer(page, 'Carla')
    await page.getByLabel('Nombre del grupo').fill('Amigos')
    await page.getByRole('button', { name: 'Guardar grupo' }).click()
    await expect(page.getByText('Amigos')).toBeVisible()

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByText('Amigos')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Cargar' }).click()
    await expect(page.locator('.player-row input').nth(0)).toHaveValue('Ana')
    await expect(page.locator('.player-row input').nth(2)).toHaveValue('Carla')
  })
})
