import { expect, test, type Page } from '@playwright/test'

async function openConfiguration(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByText('Los datos locales están preparados.')).toBeVisible({
    timeout: 15_000,
  })
  for (const name of ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fabio']) {
    await page.getByLabel('Nombre del jugador').fill(name)
    await page.getByRole('button', { name: 'Añadir' }).click()
  }
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Configura la partida' })).toBeVisible()
}

test.describe('game configuration', () => {
  test('configures, reviews, and confirms an immutable game snapshot', async ({ page }) => {
    await openConfiguration(page)
    await expect(page.getByLabel('Rondas')).toHaveValue('3')
    await page.getByLabel('Impostores').fill('2')
    await page.getByText('Con temporizador', { exact: true }).click()
    await page.getByRole('button', { name: '120 s' }).click()
    await page.getByText('Secreta', { exact: true }).click()
    await page.getByLabel('Último intento').check()
    await page.getByText('Equilibrado', { exact: true }).click()
    await page.getByText('Se conocen', { exact: true }).click()
    await page.getByText('Turnos sucesivos', { exact: true }).click()
    await page.getByRole('button', { name: 'Revisar configuración' }).click()
    await expect(page.getByRole('heading', { name: 'Revisa la partida' })).toBeVisible()
    await expect(page.getByText('120 segundos')).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar partida' }).click()
    await expect(page.getByText('La partida está configurada y guardada.')).toBeVisible()
  })

  test('returns to the unchanged prepared roster', async ({ page }) => {
    await openConfiguration(page)
    await page.getByRole('button', { name: 'Volver a jugadores' }).click()
    await expect(page.getByRole('heading', { name: 'Jugadores' })).toBeVisible()
    await expect(page.locator('.player-row input')).toHaveCount(6)
  })
})
