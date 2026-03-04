import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          name: 'Mundial de Salsa Radio',
          short_name: 'Mundial Salsa',
          description: 'La Capital Mundial de la Salsa. Radio en vivo, letras de canciones, alarmas y modo fiesta.',
          theme_color: '#dd9933',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'https://mundialdesalsa.com/wp-content/uploads/2023/12/Mundialdesalsa2026.webp',
              sizes: '192x192',
              type: 'image/webp',
              purpose: 'any'
            },
            {
              src: 'https://mundialdesalsa.com/wp-content/uploads/2023/12/Mundialdesalsa2026.webp',
              sizes: '192x192',
              type: 'image/webp',
              purpose: 'maskable'
            },
            {
              src: 'https://mundialdesalsa.com/wp-content/uploads/2023/12/Mundialdesalsa2026.webp',
              sizes: '512x512',
              type: 'image/webp',
              purpose: 'any'
            },
            {
              src: 'https://mundialdesalsa.com/wp-content/uploads/2023/12/Mundialdesalsa2026.webp',
              sizes: '512x512',
              type: 'image/webp',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
