import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const DEV_PORT = 5175
const PROXY_BASE = `/proxy/${DEV_PORT}`

export default defineConfig(({ command }) => {
  // Dev server runs behind the code-server reverse proxy; vitest resolves
  // this same config with command 'serve' too, so it must be excluded
  // explicitly or tests would inherit the proxy base and middleware.
  const isDevServer = command === 'serve' && process.env.VITEST === undefined

  return {
    base: isDevServer
      ? `${PROXY_BASE}/`
      : process.env.GITHUB_ACTIONS
        ? '/ImpostorApp/'
        : '/',
    server: {
      host: '0.0.0.0',
      port: DEV_PORT,
      allowedHosts: ['code-server.digitalpartners.es'],
      hmr: false,
    },
    plugins: [
      react(),
      isDevServer && codeServerProxyPlugin(PROXY_BASE),
      VitePWA({
        strategies: 'generateSW',
        registerType: 'prompt',
        injectRegister: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
        },
        manifest: {
          name: 'ImpostorApp',
          short_name: 'ImpostorApp',
          description: 'Juego local para compartir en grupo',
          lang: 'es',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '.',
          scope: '.',
          theme_color: '#111827',
          background_color: '#f7f8fa',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    build: {
      target: ['es2022', 'safari16.4'],
    },
    test: {
      include: ['src/**/*.test.{ts,tsx}', 'tests/integration/**/*.spec.ts'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: true,
    },
  }
})

// Reescribe las peticiones entrantes para reinsertar el prefijo del proxy de
// code-server antes de que Vite las procese (mismo patron que webtile y
// ProposedUI). Solo se activa en `npm run dev`, nunca en build ni en tests.
function codeServerProxyPlugin(base: string): Plugin {
  const prefix = '/' + base.replace(/^\/|\/$/g, '') + '/'
  return {
    name: 'code-server-proxy-fix',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && !req.url.startsWith(prefix)) {
          req.url = prefix + req.url.replace(/^\//, '')
        }
        next()
      })
    },
  }
}
