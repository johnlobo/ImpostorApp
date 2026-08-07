import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/ImpostorApp/' : '/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: false,
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
})
