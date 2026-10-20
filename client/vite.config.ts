import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'theme-init.js', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Homely',
        short_name: 'Homely',
        description: 'Tareas, planes y gastos del hogar',
        lang: 'es',
        display: 'standalone',
        start_url: '/',
        theme_color: '#FAFAF8',
        background_color: '#FAFAF8',
        // PNG generados con `npm run icons` (scripts/generate-icons.mjs).
        icons: [
          { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // La UI está en español: solo se precachean los subconjuntos latinos de Inter.
        globIgnores: ['**/inter-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    conditions: ['source'],
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
  build: {
    target: 'es2023',
  },
});
