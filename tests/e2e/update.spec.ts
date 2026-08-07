/// <reference types="node" />

import { expect, test, type Page } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { cp, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'

type WorkerVersion = 'a' | 'interrupted' | 'b'

interface VersionServer {
  origin: string
  serveWorker(version: WorkerVersion): void
  close(): Promise<void>
}

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
}

async function startVersionServer(): Promise<VersionServer> {
  const directory = await mkdtemp(join(tmpdir(), 'impostor-update-'))
  await cp(join(process.cwd(), 'dist'), directory, { recursive: true })
  const workerA = await readFile(join(directory, 'sw.js'))
  let workerVersion: WorkerVersion = 'a'

  const server = createServer((request, response) => {
    void (async () => {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
      const pathWithoutBase = pathname.replace(/^\/ImpostorApp\/?/, '/')
      const relativePath =
        pathWithoutBase === '/' ? 'index.html' : normalize(pathWithoutBase).replace(/^[/\\]+/, '')
      const filePath = join(directory, relativePath)

      if (!filePath.startsWith(directory)) {
        response.writeHead(403).end()
        return
      }

      if (relativePath === 'sw.js') {
        const body =
          workerVersion === 'a'
            ? workerA
            : workerVersion === 'b'
              ? Buffer.concat([workerA, Buffer.from('\n// impostorapp-e2e-version-b\n')])
              : Buffer.from('self.addEventListener("install", () => { this is incomplete')
        response.writeHead(200, {
          'cache-control': 'no-store',
          'content-type': 'text/javascript; charset=utf-8',
          'service-worker-allowed': '/',
        })
        response.end(body)
        return
      }

      try {
        const info = await stat(filePath)
        if (!info.isFile()) throw new Error('Not a file')
        response.writeHead(200, {
          'cache-control': 'no-store',
          'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
        })
        response.end(await readFile(filePath))
      } catch {
        response.writeHead(404).end()
      }
    })()
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const { port } = server.address() as AddressInfo

  return {
    origin: `http://127.0.0.1:${port}/ImpostorApp/`,
    serveWorker(version) {
      workerVersion = version
    },
    async close() {
      await closeServer(server)
      await rm(directory, { recursive: true, force: true })
    },
  }
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

async function checkForUpdate(page: Page, tolerateInstallationFailure = false): Promise<void> {
  await page.evaluate(async (mayFail) => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) throw new Error('Expected an active service-worker registration')
      await registration.update()
    } catch (error) {
      if (!mayFail) throw error
    }
  }, tolerateInstallationFailure)
}

async function setSimulatedGameState(page: Page, active: boolean): Promise<void> {
  await page.evaluate((nextActive) => {
    window.dispatchEvent(
      new CustomEvent('impostor:game-state-changed', {
        detail: { active: nextActive, durableStateConfirmed: true },
      }),
    )
  }, active)
}

async function seedDurableSnapshot(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('impostorapp-platform', 10)
        request.onupgradeneeded = () => {
          const database = request.result
          if (!database.objectStoreNames.contains('metadata')) {
            database.createObjectStore('metadata', { keyPath: 'id' })
          }
          if (!database.objectStoreNames.contains('recoverySnapshots')) {
            database
              .createObjectStore('recoverySnapshots', { keyPath: 'id' })
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
        request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction('recoverySnapshots', 'readwrite')
          transaction.objectStore('recoverySnapshots').put({
            id: 'active-game',
            schemaVersion: 1,
            revision: 8,
            savedAt: '2026-08-07T00:00:00.000Z',
            phase: 'clues',
            payload: { fixture: 'must-survive-update' },
            integrity: 'confirmed',
          })
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          transaction.onerror = () =>
            reject(transaction.error ?? new Error('Could not seed durable snapshot'))
        }
      }),
  )
}

async function durableSnapshotRevision(page: Page): Promise<number | undefined> {
  return page.evaluate(
    () =>
      new Promise<number | undefined>((resolve, reject) => {
        const request = indexedDB.open('impostorapp-platform', 10)
        request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction('recoverySnapshots', 'readonly')
          const recordRequest = transaction.objectStore('recoverySnapshots').get('active-game')
          recordRequest.onsuccess = () => {
            const record = recordRequest.result as { revision?: number } | undefined
            database.close()
            resolve(record?.revision)
          }
          recordRequest.onerror = () =>
            reject(recordRequest.error ?? new Error('Could not read durable snapshot'))
        }
      }),
  )
}

test.describe('controlled two-version update', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium service-worker coverage')

  let versionServer: VersionServer

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium-pwa',
      'Service-worker update cycles run once in the dedicated Chromium PWA project',
    )
    versionServer = await startVersionServer()
    await page.addInitScript(() => {
      const boots = Number(sessionStorage.getItem('impostor-e2e-boots') ?? '0') + 1
      sessionStorage.setItem('impostor-e2e-boots', String(boots))
    })
    await page.goto(versionServer.origin)
    await expect(page.getByTestId('offline-status')).toHaveAttribute(
      'data-state',
      'offline-ready',
      {
        timeout: 15_000,
      },
    )
  })

  test.afterEach(async () => {
    if (versionServer) await versionServer.close()
  })

  test('keeps version A usable when the version B worker download is interrupted', async ({
    page,
  }) => {
    versionServer.serveWorker('interrupted')
    await checkForUpdate(page, true)

    await expect(page.getByTestId('update-prompt')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'ImpostorApp' })).toBeVisible()
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('impostor-e2e-boots')))
      .toBe('1')
  })

  test('defers version B during play, activates once at a safe point, and preserves data', async ({
    page,
  }) => {
    await seedDurableSnapshot(page)
    await setSimulatedGameState(page, true)
    versionServer.serveWorker('b')
    await checkForUpdate(page)

    const prompt = page.getByTestId('update-prompt')
    await expect(prompt).toHaveAttribute('data-state', 'available')
    await expect(page.getByRole('button', { name: 'Aplicar actualización' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Ahora no' })).toBeVisible()
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('impostor-e2e-boots')))
      .toBe('1')

    await page.getByRole('button', { name: 'Ahora no' }).click()
    await expect(prompt).not.toBeVisible()
    await setSimulatedGameState(page, false)

    await expect(prompt).toHaveAttribute('data-state', 'available')
    await page.getByRole('button', { name: 'Aplicar actualización' }).click()

    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('impostor-e2e-boots')))
      .toBe('2')
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => sessionStorage.getItem('impostor-e2e-boots'))).toBe('2')
    await expect.poll(() => durableSnapshotRevision(page)).toBe(8)
  })
})
