import { expect, test, type Page } from '@playwright/test'

interface RoundSetup {
  readonly timed?: boolean
  readonly turnOrder?: 'roster' | 'random' | 'free'
}

const names = ['Ana', 'Bruno', 'Carla'] as const

async function openRound(page: Page, setup: RoundSetup = {}): Promise<void> {
  await page.goto('/')
  await expect(page.getByText('Los datos locales están preparados.')).toBeVisible({
    timeout: 15_000,
  })
  for (const name of names) {
    await page.getByLabel('Nombre del jugador').fill(name)
    await page.getByRole('button', { name: 'Añadir' }).click()
  }
  await page.getByRole('button', { name: 'Continuar' }).click()
  if (setup.timed) {
    await page.getByRole('radio', { name: 'Con temporizador' }).check()
    await page.getByLabel('Duración en segundos').fill('60')
  }
  if (setup.turnOrder) {
    const labels = {
      roster: 'Orden de la lista',
      random: 'Aleatorio por ronda',
      free: 'Libre',
    } as const
    await page
      .getByRole('group', { name: 'Orden de participación' })
      .getByRole('radio', { name: labels[setup.turnOrder], exact: true })
      .check()
  }
  await page.getByRole('button', { name: 'Revisar configuración' }).click()
  await page.getByRole('button', { name: 'Confirmar partida' }).click()
  await page.getByRole('button', { name: 'Revisar selección' }).click()
  await page.getByRole('button', { name: 'Confirmar contenido' }).click()
  await expect(page.getByRole('heading', { name: 'Reparte los roles' })).toBeVisible({
    timeout: 15_000,
  })

  for (const name of names) {
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
    await page.getByRole('button', { name: 'Pulsa para ver el concepto' }).click()
    await page.getByRole('button', { name: 'Ocultar y devolver el móvil' }).click()
  }
  await page.getByRole('button', { name: 'Empezar ronda' }).click()
  await expect(page.getByRole('heading', { name: 'Ronda 1 de 3' })).toBeVisible({
    timeout: 15_000,
  })
}

test.describe('round clues and timer', () => {
  test('runs the managed roster in order and closes only after confirmation', async ({ page }) => {
    await openRound(page)
    const shared = page.getByLabel('Fase compartida de pistas')
    await expect(shared).toContainText('Empieza Ana')
    await expect(shared).not.toContainText('IMPOSTOR')
    await expect(shared).not.toContainText('Categoría')

    await page.getByRole('button', { name: 'Comenzar pistas' }).click()
    for (const name of names) {
      await expect(shared).toContainText(name)
      await page.getByRole('button', { name: 'Siguiente jugador' }).click()
    }
    await expect(shared).toContainText('Conversación general')

    await page.getByRole('button', { name: 'Terminar pistas' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Terminar las pistas?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Seguir conversando' }).click()
    await expect(dialog).toBeHidden()
    await page.getByRole('button', { name: 'Terminar pistas' }).click()
    await page.getByRole('button', { name: 'Confirmar y continuar' }).click()
    await expect(shared).toContainText('Fase cerrada y preparada para votar.')
  })

  test('recovers the exact managed turn without exposing or replaying secrets', async ({
    page,
  }) => {
    await openRound(page)
    await page.getByRole('button', { name: 'Comenzar pistas' }).click()
    await page.getByRole('button', { name: 'Siguiente jugador' }).click()
    await expect(page.getByLabel('Fase compartida de pistas')).toContainText('Bruno')

    await page.reload()

    const shared = page.getByLabel('Fase compartida de pistas')
    await expect(shared).toContainText('Bruno', { timeout: 15_000 })
    await expect(shared).not.toContainText('IMPOSTOR')
    await expect(shared).not.toContainText('Categoría')
    await expect(page.getByRole('button', { name: 'Siguiente jugador' })).toBeEnabled()
  })

  test('persists a paused timer across reload and resumes without reset', async ({ page }) => {
    await openRound(page, { timed: true, turnOrder: 'free' })
    await page.getByRole('button', { name: 'Comenzar pistas' }).click()
    const clock = page.getByLabel('Fase compartida de pistas').getByText(/^\d+:\d{2}$/)
    await expect(clock).toBeVisible()
    await page.getByRole('button', { name: 'Pausar tiempo' }).click()
    const paused = await clock.textContent()
    await expect(page.getByRole('button', { name: 'Reanudar tiempo' })).toBeEnabled()

    await page.reload()

    await expect(page.getByRole('button', { name: 'Reanudar tiempo' })).toBeEnabled({
      timeout: 15_000,
    })
    await expect(clock).toHaveText(paused ?? '')
    await page.getByRole('button', { name: 'Reanudar tiempo' }).click()
    await expect(page.getByRole('button', { name: 'Pausar tiempo' })).toBeEnabled()
  })
})
