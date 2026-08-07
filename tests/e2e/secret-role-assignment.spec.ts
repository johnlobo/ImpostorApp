import { expect, test, type Page } from '@playwright/test'

interface RoleSetup {
  impostors?: number
  knownImpostors?: boolean
}

async function openRoleAssignment(
  page: Page,
  names: readonly string[] = ['Ana', 'Bruno', 'Carla'],
  setup: RoleSetup = {},
): Promise<void> {
  await page.goto('/')
  await expect(page.getByText('Los datos locales están preparados.')).toBeVisible({
    timeout: 15_000,
  })
  for (const name of names) {
    await page.getByLabel('Nombre del jugador').fill(name)
    await page.getByRole('button', { name: 'Añadir' }).click()
  }
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Configura la partida' })).toBeVisible()
  if (setup.impostors) await page.getByLabel('Impostores').fill(String(setup.impostors))
  if (setup.knownImpostors) await page.getByLabel('Se conocen').check()
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

async function reveal(page: Page, name: string): Promise<string> {
  await playerButton(page, name).click()
  await expect(page.getByLabel('Vista privada del jugador')).toBeVisible()
  await page.getByRole('button', { name: 'Pulsa para ver el concepto' }).click()
  const privateContent = page.locator('.private-role-content')
  await expect(privateContent).toBeVisible()
  const payload = (await privateContent.textContent())?.trim() ?? ''
  expect(payload.length).toBeGreaterThan(0)
  return payload
}

async function conceal(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Ocultar y devolver el móvil' }).click()
  await expect(page.getByRole('heading', { name: 'Reparte los roles' })).toBeVisible()
}

test.describe('secret role assignment', () => {
  test('passes one mobile privately, blocks completed players and starts only at N/N', async ({
    page,
  }) => {
    const names = ['Ana', 'Bruno', 'Carla']
    await openRoleAssignment(page, names)

    const shared = page.getByLabel('Lista compartida de revelación')
    await expect(shared.getByLabel('Progreso de revelación')).toHaveText('0 de 3')
    await expect(page.getByRole('button', { name: 'Empezar ronda' })).toBeDisabled()
    await expect(shared).not.toContainText('IMPOSTOR')
    await expect(shared).not.toContainText('Categoría')

    for (let index = 0; index < names.length; index += 1) {
      const name = names[index]!
      const privatePayload = await reveal(page, name)
      await conceal(page)

      await expect(shared).not.toContainText(privatePayload)
      await expect(shared).not.toContainText('IMPOSTOR')
      await expect(playerButton(page, name)).toBeDisabled()
      await expect(shared.getByLabel('Progreso de revelación')).toHaveText(`${index + 1} de 3`)
      const start = page.getByRole('button', { name: 'Empezar ronda' })
      if (index === names.length - 1) await expect(start).toBeEnabled()
      else await expect(start).toBeDisabled()
    }

    const start = page.getByRole('button', { name: 'Empezar ronda' })
    await expect(start).toBeEnabled()
    await start.click()
    await expect(page.getByRole('heading', { name: 'La ronda está preparada' })).toBeVisible()
  })

  test('reloads a revealed private view offline onto the safe shared list', async ({
    context,
    page,
  }) => {
    await openRoleAssignment(page)
    const privatePayload = await reveal(page, 'Ana')
    await expect(page.getByLabel('Vista privada del jugador')).toContainText(privatePayload)

    await context.setOffline(true)
    await page.reload()

    const shared = page.getByLabel('Lista compartida de revelación')
    await expect(shared).toBeVisible({ timeout: 15_000 })
    await expect(shared).not.toContainText(privatePayload)
    await expect(shared).not.toContainText('IMPOSTOR')
    await expect(playerButton(page, 'Ana')).toBeDisabled()
    await expect(shared.getByLabel('Progreso de revelación')).toHaveText('1 de 3')
  })

  test('shows each known impostor only the other impostor in its private view', async ({
    page,
  }) => {
    const names = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fabio']
    await openRoleAssignment(page, names, { impostors: 2, knownImpostors: true })
    const impostors: { name: string; payload: string }[] = []

    for (const name of names) {
      const payload = await reveal(page, name)
      if (payload.includes('IMPOSTOR')) {
        expect(payload).toContain('Tus compañeros:')
        impostors.push({ name, payload })
      } else {
        expect(payload).not.toContain('Tus compañeros:')
      }
      await conceal(page)
    }

    expect(impostors).toHaveLength(2)
    expect(impostors[0]!.payload).toContain(impostors[1]!.name)
    expect(impostors[1]!.payload).toContain(impostors[0]!.name)
  })
})
