import { expect, test, type Page } from '@playwright/test'

async function openCatalog(page: Page, rounds = 3): Promise<void> {
  await page.goto('/')
  await expect(page.getByText('Los datos locales están preparados.')).toBeVisible({
    timeout: 15_000,
  })
  for (const name of ['Ana', 'Bruno', 'Carla']) {
    await page.getByLabel('Nombre del jugador').fill(name)
    await page.getByRole('button', { name: 'Añadir' }).click()
  }
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Configura la partida' })).toBeVisible()
  if (rounds !== 3) await page.getByLabel('Rondas').fill(String(rounds))
  await page.getByRole('button', { name: 'Revisar configuración' }).click()
  await page.getByRole('button', { name: 'Confirmar partida' }).click()
  await expect(page.getByRole('heading', { name: 'Elige las categorías' })).toBeVisible({
    timeout: 15_000,
  })
}

async function createCategory(page: Page, name: string, concepts: string): Promise<void> {
  await page.getByLabel('Nombre', { exact: true }).fill(name)
  await page.getByLabel('Conceptos, uno por línea').fill(concepts)
  await page.getByRole('button', { name: 'Crear categoría' }).click()
  await expect(page.getByText(new RegExp(`^${name}, `))).toBeVisible()
}

async function selectOnlyCategory(page: Page, name: string): Promise<void> {
  await page.getByLabel('Elegir categorías').check()
  await page.getByLabel(new RegExp(`^${name}, `)).check()
  await page.getByLabel(/^Animales, /).uncheck()
}

test.describe('content catalog', () => {
  test('hands off players and configuration, selects and confirms a catalog pool', async ({
    page,
  }) => {
    await openCatalog(page)

    await expect(page.getByLabel('Mostrar contenido adulto')).not.toBeChecked()
    await page.getByLabel('Aleatoria por ronda').check()
    await page.getByRole('button', { name: 'Revisar selección' }).click()
    await expect(page.getByRole('heading', { name: 'Revisar selección' })).toBeVisible()
    await expect(page.getByText('Una categoría aleatoria por ronda')).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar contenido' }).click()
    await expect(page.getByRole('heading', { name: 'Contenido preparado' })).toBeVisible()
  })

  test('requires explicit confirmation before enabling adult content', async ({ page }) => {
    await openCatalog(page)

    await page.getByLabel('Mostrar contenido adulto').check()
    const dialog = page.getByRole('dialog', { name: 'Activar contenido adulto' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByLabel('Mostrar contenido adulto')).not.toBeChecked()
    await page.getByLabel('Mostrar contenido adulto').check()
    await dialog.getByRole('button', { name: 'Activar' }).click()
    await expect(page.getByLabel('Mostrar contenido adulto')).toBeChecked()
  })

  test('persists a custom category across an offline reload', async ({
    browserName,
    context,
    page,
  }) => {
    test.skip(browserName !== 'chromium', 'Offline service-worker cycle targets Chromium')
    await openCatalog(page)
    await createCategory(page, 'Sobremesa', 'Anécdota\nBrindis\nReceta')

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Elige las categorías' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/^Sobremesa, 3 conceptos$/)).toBeVisible()
  })

  test('blocks on exhaustion and resumes after a confirmed history reset', async ({ page }) => {
    await openCatalog(page, 1)
    await createCategory(page, 'Ronda única', 'Único concepto')
    await selectOnlyCategory(page, 'Ronda única')
    await page.getByRole('button', { name: 'Revisar selección' }).click()
    await page.getByRole('button', { name: 'Confirmar contenido' }).click()

    await page.getByRole('button', { name: 'Extraer concepto' }).click()
    await expect(page.getByText('Concepto reservado correctamente.')).toBeVisible()
    await page.getByRole('button', { name: 'Extraer concepto' }).click()
    await expect(page.getByRole('alert')).toContainText('Se han agotado los conceptos')

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Reiniciar historial' }).click()
    await page.getByRole('button', { name: 'Extraer concepto' }).click()
    await expect(page.getByText('Concepto reservado correctamente.')).toBeVisible()
  })
})
