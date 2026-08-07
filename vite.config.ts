import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/ImpostorApp/' : '/',
  plugins: [react()],
  build: {
    target: ['es2022', 'safari16.4'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
