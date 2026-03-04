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
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'Mundial de Salsa Radio',
          short_name: 'Mundial Salsa',
          description: 'La Capital Mundial de la Salsa. Radio en vivo, letras de canciones, alarmas y modo fiesta.',
          theme_color: '#dd9933', // El dorado de tu logo
          background_color: '#09090b', // El fondo oscuro de tu app
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              // Se recomienda usar rutas relativas si las descargas a la carpeta /public
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
          // Esto asegura que todo el contenido visual y funcional se guarde en el caché
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