import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register'; // Importa el registrador de PWA
import App from './App.tsx';
import './index.css';

// Registra el Service Worker para que la App funcione offline y sea instalable
// 'immediate: true' asegura que la App se registre en cuanto cargue el navegador
const updateSW = registerSW({
  immediate: true,
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