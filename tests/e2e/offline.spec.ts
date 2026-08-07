import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const offlineStatus = (page: Page) => page.getByTestId('offline-status')

async function expectOfflineReady(page: Page) {
  await expect(offlineStatus(page)).toHaveAttribute('data-state', 'offline-ready', {
    timeout: 15_000,
  })
}

async function cachedApplicationResources(page: Page) {
  return page.evaluate(async () => {
    const cacheNames = await caches.keys()
    const requests = await Promise.all(
      cacheNames.map(async (cacheName) => {
        const cache = await caches.open(cacheName)
        return cache.keys()
      }),
    )

    return {
      cacheNames,
      urls: requests.flat().map(({ url }) => url),
    }
  })
}

async function clearApplicationCaches(page: Page) {
  await page.evaluate(async () => {
    await Promise.all((await caches.keys()).map((cacheName) => caches.delete(cacheName)))
  })
}

async function setOffline(context: BrowserContext, offline: boolean) {
  await context.setOffline(offline)
}

test.describe('production offline lifecycle', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'PWA cache lifecycle is Chromium-only')

  test('marks the production build ready only after its application shell is precached', async ({
    page,
  }) => {
    await page.goto('/')
    await expectOfflineReady(page)

    const cached = await cachedApplicationResources(page)

    expect(cached.cacheNames.length).toBeGreaterThan(0)
    expect(cached.urls.some((url) => /\/(?:index\.html)?$/.test(new URL(url).pathname))).toBe(true)
    expect(cached.urls.some((url) => /\/assets\/.*\.js$/.test(new URL(url).pathname))).toBe(true)
    expect(cached.urls.some((url) => /\/assets\/.*\.css$/.test(new URL(url).pathname))).toBe(true)
  })

  test('explains an interrupted first preparation and retries when connectivity returns', async ({
    context,
    page,
  }) => {
    await context.route('**/sw.js', (route) => route.abort('connectionfailed'))
    await page.goto('/')

    await expect(offlineStatus(page)).toHaveAttribute('data-state', 'online-not-ready')
    await expect(page.getByTestId('first-load-required')).toBeVisible()
    await expect(page.getByTestId('offline-retry')).toBeEnabled()

    await context.unroute('**/sw.js')
    await page.getByTestId('offline-retry').click()

    await expectOfflineReady(page)
  })

  test('reopens a prepared production build with no network', async ({ context, page }) => {
    await page.goto('/')
    await expectOfflineReady(page)
    await expect
      .poll(async () => (await cachedApplicationResources(page)).urls.length)
      .toBeGreaterThan(0)

    await page.close()
    await setOffline(context, true)

    const offlinePage = await context.newPage()
    await offlinePage.goto('/')

    await expectOfflineReady(offlinePage)
    await expect(offlinePage.getByRole('heading', { name: 'ImpostorApp' })).toBeVisible()
  })

  test('detects removed caches and offers safe recovery instead of reporting ready', async ({
    context,
    page,
  }) => {
    await page.goto('/')
    await expectOfflineReady(page)
    await clearApplicationCaches(page)
    await setOffline(context, true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))

    await expect(offlineStatus(page)).not.toHaveAttribute('data-state', 'offline-ready')
    await expect(offlineStatus(page)).toHaveAttribute('data-state', 'online-not-ready')
    await expect(page.getByTestId('first-load-required')).toBeVisible()
    await expect(page.getByTestId('offline-retry')).toBeDisabled()

    await setOffline(context, false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.getByTestId('offline-retry')).toBeEnabled()
    await page.getByTestId('offline-retry').click()

    await expectOfflineReady(page)
  })
})
