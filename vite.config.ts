import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    // IMPORTANTE: Esta línea permite que los archivos se encuentren en GitHub Pages
    base: '/Mundialdesalsa-Radio-APP/', 
    
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // Volvemos a la configuración automática (genera el Service Worker solo)
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['pwa-192x192.webp', 'pwa-512x512.webp'],
        manifest: {
          name: 'Mundial de Salsa Radio',
          short_name: 'Mundial Salsa',
          description: 'Radio en vivo, letras de canciones y todo sobre la cultura salsera desde Cali.',
          theme_color: '#dd9933',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'portrait',
          // Ajustamos las rutas para que coincidan con la subcarpeta de GitHub
          start_url: '/Mundialdesalsa-Radio-APP/',
          scope: '/Mundialdesalsa-Radio-APP/',
          icons: [
            {
              src: 'pwa-192x192.webp',
              sizes: '192x192',
              type: 'image/webp',
              purpose: 'any'
            },
            {
              src: 'pwa-192x192.webp',
              sizes: '192x192',
              type: 'image/webp',
              purpose: 'maskable'
            },
            {
              src: 'pwa-512x512.webp',
              sizes: '512x512',
              type: 'image/webp',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.webp',
              sizes: '512x512',
              type: 'image/webp',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          // Estrategia de caché automática para que la radio cargue rápido
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
      // Mantiene compatibilidad con AI Studio
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
