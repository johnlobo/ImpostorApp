import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function openCatalog(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Jugadores' })).toBeVisible()
  for (const name of ['Ana', 'Bruno', 'Carla']) {
    await page.getByLabel('Nombre del jugador').fill(name)
    await page.getByRole('button', { name: 'Añadir' }).click()
  }
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Configura la partida' })).toBeVisible()
  await page.getByRole('button', { name: 'Revisar configuración' }).click()
  await page.getByRole('button', { name: 'Confirmar partida' }).click()
  await expect(page.getByRole('heading', { name: 'Elige las categorías' })).toBeVisible()
}

async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .include('.content-catalog-screen')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
}

test.describe('content catalog accessibility and privacy', () => {
  test('has no detectable violations in selection, adult confirmation and review states', async ({
    page,
  }) => {
    await openCatalog(page)
    await expectAccessible(page)

    await page.getByLabel('Mostrar contenido adulto').click()
    await expect(page.getByRole('dialog', { name: 'Activar contenido adulto' })).toBeVisible()
    await expectAccessible(page)
    await page.getByRole('button', { name: 'Cancelar' }).click()

    await page.getByRole('button', { name: 'Revisar selección' }).click()
    await expect(page.getByRole('heading', { name: 'Revisar selección' })).toBeVisible()
    await expectAccessible(page)
  })

  test('supports keyboard operation for modes, adult confirmation and custom content', async ({
    page,
  }) => {
    await openCatalog(page)
    const all = page.getByLabel('Todas', { exact: true })
    await all.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByLabel('Aleatoria por ronda')).toBeChecked()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByLabel('Elegir categorías')).toBeChecked()

    const adult = page.getByLabel('Mostrar contenido adulto')
    await adult.focus()
    await page.keyboard.press('Space')
    const dialog = page.getByRole('dialog', { name: 'Activar contenido adulto' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancelar' }).focus()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()

    await page.getByLabel('Nombre', { exact: true }).focus()
    await page.keyboard.type('Teclado')
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Conceptos, uno por línea')).toBeFocused()
    await page.keyboard.type('Uno\nDos\nTres')
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Contenido adulto', { exact: true })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Crear categoría' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Teclado, 3 conceptos')).toBeVisible()
  })

  test('keeps secret concept text out of URL, public errors and durable history', async ({
    page,
  }) => {
    const secret = 'MARCADOR PRIVADO IMP4'
    await openCatalog(page)
    await page.getByLabel('Nombre', { exact: true }).fill('Privada')
    await page.getByLabel('Conceptos, uno por línea').fill(`${secret}\nSegundo\nTercero`)
    await page.getByRole('button', { name: 'Crear categoría' }).click()
    await expect(page.getByText('Privada, 3 conceptos')).toBeVisible()

    await page.getByLabel('Elegir categorías').check()
    const categoryFieldset = page.getByRole('group', { name: 'Categorías' })
    const categoryChecks = categoryFieldset.getByRole('checkbox')
    await categoryFieldset.getByLabel('Privada, 3 conceptos').check()
    for (let index = 0; index < (await categoryChecks.count()); index += 1) {
      const checkbox = categoryChecks.nth(index)
      const label = await checkbox.evaluate((element) => element.parentElement?.textContent ?? '')
      if ((await checkbox.isChecked()) && !label.includes('Privada')) await checkbox.uncheck()
    }
    await page.getByRole('button', { name: 'Revisar selección' }).click()
    await page.getByRole('button', { name: 'Confirmar contenido' }).click()
    await expect(page.getByRole('heading', { name: 'Contenido preparado' })).toBeVisible()
    await page.getByRole('button', { name: 'Extraer concepto' }).click()
    await expect(page.getByText('Concepto reservado correctamente.')).toBeVisible()

    const publicSurfaces = await page.evaluate(async () => {
      const request = indexedDB.open('impostorapp-platform')
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
      })
      const transaction = database.transaction('used-concepts', 'readonly')
      const recordsRequest = transaction.objectStore('used-concepts').getAll()
      const records = await new Promise<unknown[]>((resolve, reject) => {
        recordsRequest.onsuccess = () => resolve(recordsRequest.result as unknown[])
        recordsRequest.onerror = () =>
          reject(recordsRequest.error ?? new Error('Could not read concept history'))
      })
      database.close()
      return {
        href: window.location.href,
        historyState: JSON.stringify(window.history.state),
        records,
        alerts: Array.from(document.querySelectorAll('[role="alert"]')).map(
          (element) => element.textContent,
        ),
      }
    })
    expect(JSON.stringify(publicSurfaces)).not.toContain(secret)
    expect(publicSurfaces.records.length).toBeGreaterThan(0)

    await page.getByLabel('Nombre', { exact: true }).fill('Inválida')
    await page.getByLabel('Conceptos, uno por línea').fill(`${secret}\n${secret}`)
    await page.getByRole('button', { name: 'Crear categoría' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    expect(await page.getByRole('alert').textContent()).not.toContain(secret)
  })

  test('keeps catalog, editor and long labels inside a 320px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await openCatalog(page)
    await page.getByLabel('Nombre', { exact: true }).fill('Categoría personalizada muy extensa')
    await page
      .getByLabel('Conceptos, uno por línea')
      .fill('Concepto con una descripción suficientemente extensa\nDos\nTres')
    await page.getByRole('button', { name: 'Crear categoría' }).click()

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }))
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
  })
})
