import { useEffect, useState } from 'react';
import { Analytics } from "@vercel/analytics/react";
import { Player } from "./components/Player";

export default function App() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Capturamos el evento que el navegador bloquea por defecto
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Mostramos el aviso de instalación oficial
    installPrompt.prompt();
    
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <main className="relative min-h-screen bg-zinc-950 selection:bg-[#dd9933]/30">
      <Player />

      {/* Botón de Instalación Flotante */}
      {installPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4">
          <button
            onClick={handleInstallClick}
            className="w-full bg-[#dd9933] hover:bg-[#c6892e] text-black font-bold py-3 px-6 rounded-2xl shadow-2xl shadow-[#dd9933]/20 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 animate-bounce-short"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Instalar Mundial de Salsa
          </button>
        </div>
      )}
      <Analytics />
    </main>
  );
}
