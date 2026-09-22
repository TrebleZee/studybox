import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Spec catalogue files are lazy chunks; they must be precached too so
        // catalogue-backed onboarding templates work offline.
        globPatterns: ['**/*.{js,json,css,html,png,svg,ico,woff2}'],
        // StudyBox is a single-route SPA, so any offline navigation (a deep
        // link, a reload, or the installed PWA's start_url) should fall back
        // to the cached app shell instead of failing with no network.
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'StudyBox',
        short_name: 'StudyBox',
        description: 'Study planner and revision timer',
        theme_color: '#131313',
        background_color: '#0C0C0C',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 15000,
  },
})
