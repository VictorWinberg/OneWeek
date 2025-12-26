import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: '../backend/dist/public',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    process.env.VITE_ENABLE_PWA === 'true' &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['oneweek.svg'],
        manifest: {
          name: 'OneWeek - Familjekalender',
          short_name: 'OneWeek',
          description: 'Familjekalendern för veckofokus - Se hela familjens vecka samlade',
          start_url: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#1a1814',
          background_color: '#1a1814',
          icons: [
            {
              src: 'icons/oneweek-16x16.png',
              sizes: '16x16',
              type: 'image/png',
            },
            {
              src: 'icons/oneweek-32x32.png',
              sizes: '32x32',
              type: 'image/png',
            },
            {
              src: 'icons/oneweek-96x96.png',
              sizes: '96x96',
              type: 'image/png',
            },
            {
              src: 'icons/oneweek-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/oneweek-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\/.*/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
  ].filter(Boolean),
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
