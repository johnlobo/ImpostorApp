import { expect, test, type Page } from '@playwright/test'

const databaseName = 'impostorapp-platform'
const databaseVersion = 10
const recoveryStore = 'recoverySnapshots'

interface SnapshotFixture {
  id: 'active-game'
  schemaVersion: number
  revision: number
  savedAt: string
  phase: string
  payload: Record<string, unknown>
  integrity: 'confirmed'
}

function snapshot(revision: number, phase = 'setup'): SnapshotFixture {
  return {
    id: 'active-game',
    schemaVersion: 1,
    revision,
    savedAt: '2026-08-07T00:00:00.000Z',
    phase,
    payload: { fixture: `revision-${revision}` },
    integrity: 'confirmed',
  }
}

async function deleteDatabase(page: Page): Promise<void> {
  await page.evaluate(
    ({ name }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error ?? new Error(`Could not delete ${name}`))
        request.onblocked = () => reject(new Error(`Database ${name} deletion was blocked`))
      }),
    { name: databaseName },
  )
}

async function seedSnapshot(page: Page, value: SnapshotFixture): Promise<void> {
  await page.evaluate(
    ({ name, version, storeName, record }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(name, version)
        request.onupgradeneeded = () => {
          const database = request.result
          if (!database.objectStoreNames.contains('metadata')) {
            database.createObjectStore('metadata', { keyPath: 'id' })
          }
          if (!database.objectStoreNames.contains(storeName)) {
            database
              .createObjectStore(storeName, { keyPath: 'id' })
              .createIndex('revision', 'revision')
          }
          for (const collection of [
            'player-groups',
            'custom-categories',
            'used-concepts',
            'preferences',
          ]) {
            if (!database.objectStoreNames.contains(collection)) {
              database.createObjectStore(collection, { keyPath: 'key' })
            }
          }
        }
        request.onerror = () => reject(request.error ?? new Error(`Could not open ${name}`))
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction(storeName, 'readwrite')
          transaction.objectStore(storeName).put(record)
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          transaction.onerror = () =>
            reject(transaction.error ?? new Error(`Could not seed ${storeName}`))
        }
      }),
    {
      name: databaseName,
      version: databaseVersion,
      storeName: recoveryStore,
      record: value,
    },
  )
}

async function abortSnapshotWrite(page: Page, value: SnapshotFixture): Promise<void> {
  await page.evaluate(
    ({ name, version, storeName, record }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(name, version)
        request.onerror = () => reject(request.error ?? new Error(`Could not open ${name}`))
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction(storeName, 'readwrite')
          transaction.objectStore(storeName).put(record)
          transaction.abort()
          transaction.onabort = () => {
            database.close()
            resolve()
          }
          transaction.onerror = (event) => event.preventDefault()
        }
      }),
    {
      name: databaseName,
      version: databaseVersion,
      storeName: recoveryStore,
      record: value,
    },
  )
}

async function expectRecoveredRevision(page: Page, revision: number): Promise<void> {
  await expect(page.getByTestId('recovery-status')).toHaveAttribute('data-state', 'restored')
  await expect(page.getByTestId('recovery-snapshot')).toHaveAttribute(
    'data-revision',
    String(revision),
  )
}

async function failIndexedDbOpen(
  page: Page,
  errorName: 'QuotaExceededError' | 'InvalidStateError',
) {
  await page.addInitScript((name) => {
    Object.defineProperty(IDBFactory.prototype, 'open', {
      configurable: true,
      value() {
        throw new DOMException('Simulated persistence failure', name)
      },
    })
  }, errorName)
}

test.describe('durable recovery', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'IndexedDB fault injection is Chromium-only',
  )

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await deleteDatabase(page)
  })

  test('restores the last confirmed snapshot after closing and reopening', async ({ page }) => {
    await seedSnapshot(page, snapshot(7, 'clues'))
    await page.reload()
    await expectRecoveredRevision(page, 7)

    await page.close()
    const reopened = await page.context().newPage()
    await reopened.goto('/')

    await expectRecoveredRevision(reopened, 7)
  })

  test('ignores an interrupted write and restores the previous complete revision', async ({
    page,
  }) => {
    await seedSnapshot(page, snapshot(3, 'clues'))
    await abortSnapshotWrite(page, snapshot(4, 'voting'))
    await page.reload()

    await expectRecoveredRevision(page, 3)
    await expect(page.getByTestId('recovery-snapshot')).toHaveAttribute('data-phase', 'clues')
  })

  test('reports storage-full without replacing existing data', async ({ page }) => {
    await seedSnapshot(page, snapshot(2))
    await failIndexedDbOpen(page, 'QuotaExceededError')
    await page.reload()

    await expect(page.getByTestId('recovery-status')).toHaveAttribute('data-state', 'storage-full')
    await expect(page.getByRole('alert')).toContainText(
      'No hay espacio suficiente para guardar de forma segura.',
    )
    await expect(page.getByTestId('recovery-delete')).toBeVisible()
  })

  test('reports unavailable IndexedDB and offers a safe exit', async ({ page }) => {
    await failIndexedDbOpen(page, 'InvalidStateError')
    await page.reload()

    await expect(page.getByTestId('recovery-status')).toHaveAttribute(
      'data-state',
      'storage-unavailable',
    )
    await expect(page.getByRole('alert')).toContainText(
      'El almacenamiento local no está disponible.',
    )
    await expect(page.getByTestId('recovery-safe-exit')).toBeVisible()
  })

  test('detects browser-initiated database removal after a successful recovery', async ({
    page,
  }) => {
    await seedSnapshot(page, snapshot(5))
    await page.reload()
    await expectRecoveredRevision(page, 5)

    await deleteDatabase(page)
    await page.reload()

    await expect(page.getByTestId('recovery-status')).toHaveAttribute(
      'data-state',
      'storage-unavailable',
    )
    await expect(page.getByRole('alert')).toContainText(
      'El almacenamiento local no está disponible.',
    )
  })

  test('deletes local data only after explaining consequences and receiving confirmation', async ({
    page,
  }) => {
    await seedSnapshot(page, snapshot(6))
    await page.reload()
    await expectRecoveredRevision(page, 6)

    await page.getByTestId('recovery-delete').click()
    const dialog = page.getByTestId('recovery-delete-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('se eliminarán la partida y los datos guardados')
    await expect(page.getByTestId('recovery-delete-confirm')).toBeDisabled()

    await page.getByTestId('recovery-delete-cancel').click()
    await expectRecoveredRevision(page, 6)

    await page.getByTestId('recovery-delete').click()
    await page.getByTestId('recovery-delete-confirmation').check()
    await page.getByTestId('recovery-delete-confirm').click()

    await expect(page.getByTestId('recovery-status')).toHaveAttribute('data-state', 'empty')
    await page.reload()
    await expect(page.getByTestId('recovery-status')).toHaveAttribute('data-state', 'empty')
  })
})
