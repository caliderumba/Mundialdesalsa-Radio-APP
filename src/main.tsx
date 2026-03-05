import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Registra el Service Worker forzando el alcance (scope) a la subcarpeta del repositorio
const updateSW = registerSW({
  immediate: true,
  // Esta configuración asegura que el registro use la ruta relativa correcta en GitHub Pages
  onRegisteredSW(swScriptUrl, registration) {
    console.log('Service Worker registrado con éxito en:', swScriptUrl);
  },
  onNeedRefresh() {
    if (confirm('Hay una nueva versión de la Radio disponible. ¿Deseas actualizar?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('Mundial de Salsa está lista para funcionar offline.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
