import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works whether it's served from a domain root
  // or a sub-path (e.g. a GitHub Pages project site like /MarcMirabaud/).
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Golf Stats',
        short_name: 'Golf Stats',
        description: 'Suivi de statistiques de golf et carnets de parcours, hors-ligne.',
        theme_color: '#155c2c',
        background_color: '#155c2c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The live-scoring app lives under /live/ on the same origin: this SW
        // must never answer its navigations with the stats app's shell.
        navigateFallbackDenylist: [/\/live\//],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              !url.pathname.includes('/live/') &&
              ['style', 'script', 'document', 'font'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'app-shell' },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
