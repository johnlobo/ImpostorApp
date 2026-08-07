import { expect, test } from '@playwright/test'

type WebAppManifest = {
  name?: string
  short_name?: string
  lang?: string
  display?: string
  orientation?: string
  start_url?: string
  scope?: string
  theme_color?: string
  background_color?: string
  icons?: Array<{
    src?: string
    sizes?: string
    type?: string
    purpose?: string
  }>
}

test.describe('PWA installability metadata', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Installability checks target Chromium',
  )

  test('publishes an installable Spanish manifest with standalone portrait presentation', async ({
    page,
  }) => {
    await page.goto('/')

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(manifestHref).toBeTruthy()

    const manifestUrl = new URL(manifestHref!, page.url())
    const response = await page.request.get(manifestUrl.toString())
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('application/manifest+json')

    const manifest = (await response.json()) as WebAppManifest
    expect(manifest).toMatchObject({
      name: 'ImpostorApp',
      short_name: 'ImpostorApp',
      lang: 'es',
      display: 'standalone',
      orientation: 'portrait',
    })
    expect(manifest.theme_color).toMatch(/^#[\da-f]{6}$/i)
    expect(manifest.background_color).toMatch(/^#[\da-f]{6}$/i)

    const startUrl = new URL(manifest.start_url ?? '', manifestUrl)
    const scopeUrl = new URL(manifest.scope ?? '', manifestUrl)
    expect(startUrl.origin).toBe(manifestUrl.origin)
    expect(startUrl.pathname.startsWith(scopeUrl.pathname)).toBe(true)

    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
        expect.objectContaining({ purpose: expect.stringContaining('maskable') }),
      ]),
    )

    for (const icon of manifest.icons ?? []) {
      const iconResponse = await page.request.get(new URL(icon.src ?? '', manifestUrl).toString())
      expect(iconResponse.ok(), `manifest icon ${icon.src} should be reachable`).toBe(true)
    }
  })

  test('exposes browser and installed-window presentation metadata', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      /^#[\da-f]{6}$/i,
    )
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /viewport-fit=cover/,
    )
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
      'content',
      'yes',
    )
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
      'content',
      'ImpostorApp',
    )
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /\.png$/)

    expect(
      await page.evaluate(() => ({
        standalone: window.matchMedia('(display-mode: standalone)').matches,
        standaloneMediaQuerySupported: window.matchMedia('(display-mode: browser)').matches,
      })),
    ).toEqual({
      standalone: false,
      standaloneMediaQuerySupported: true,
    })
  })
})
