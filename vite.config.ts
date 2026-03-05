import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    // IMPORTANTE: Define la subcarpeta para todos los recursos del proyecto
    base: '/Mundialdesalsa-Radio-APP/', 
    
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        // Cambiamos a PNG para evitar errores de "recurso no válido" en el navegador
        includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'favicon.ico'],
        manifest: {
          name: 'Mundial de Salsa Radio',
          short_name: 'MundialDeSalsa',
          description: 'Radio en vivo, letras de canciones y todo sobre la cultura salsera desde Cali.',
          theme_color: '#dd9933',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'portrait',
          // Asegura que al abrir la PWA se use la ruta del repositorio
          start_url: './', 
          scope: './', 
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          // Soluciona el error 404 al registrar el Service Worker en la subcarpeta
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          // Asegura que las rutas internas carguen el index.html en GitHub Pages
          navigateFallback: 'index.html'
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
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
