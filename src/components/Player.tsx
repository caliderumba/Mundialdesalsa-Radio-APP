import React, { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Pause, 
  History, 
  AlarmClock, 
  Bell,
  Zap,
  Mic2,
  MonitorSmartphone, // Icono para la App de Windows/Móvil
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VinylRecord } from "./VinylRecord";
import { Visualizer } from "./Visualizer";
import { cn } from "@/src/lib/utils";
import { format } from "date-fns";
import confetti from "canvas-confetti";

// Declaración para que TypeScript reconozca Google Analytics
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// Constants
const STREAM_URL = "https://stream.zeno.fm/kkertu70mm5tv";
const ZENO_METADATA_URL = "https://api.zeno.fm/mounts/metadata/subscribe/kkertu70mm5tv";
const API_KEY_LASTFM = "f5039be7c53bb811b439652bc75ced48";
const FALLBACK_COVER_URL = "https://mundialdesalsa.com/wp-content/uploads/2023/12/Mundialdesalsa2026.webp";

interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl: string;
  timestamp: Date;
}

interface Alarm {
  id: string;
  time: string;
  enabled: boolean;
}

export function Player() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [metadata, setMetadata] = useState<SongMetadata>({
    id: "1",
    title: "Mundial de Salsa",
    artist: "En Vivo",
    album: "La Capital Mundial de la Salsa",
    coverUrl: FALLBACK_COVER_URL,
    timestamp: new Date(),
  });
  const [history, setHistory] = useState<SongMetadata[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    const saved = localStorage.getItem("radio_alarms");
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);
  const [showAlarms, setShowAlarms] = useState(false);
  const [isFiestaMode, setIsFiestaMode] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  // Estados para la instalación
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isCencerroShaking, setIsCencerroShaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const cowbellRef = useRef<HTMLAudioElement>(null);

  const initAudioContext = () => {
    if (audioContext || !audioRef.current) return;
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const src = context.createMediaElementSource(audioRef.current);
    const analyserNode = context.createAnalyser();
    src.connect(analyserNode);
    analyserNode.connect(context.destination);
    analyserNode.fftSize = 256;
    setAudioContext(context);
    setAnalyser(analyserNode);
  };

  useEffect(() => {
    // Escuchar el evento de instalación
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      
      // RASTREO: El navegador ofreció la App
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'pwa_offer_view', { 'event_category': 'PWA' });
      }
    };

    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
      
      // RASTREO: Instalación exitosa
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'pwa_install_success', {
          'event_category': 'PWA',
          'event_label': 'MundialDeSalsa App'
        });
      }

      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#dd9933', '#ffffff', '#000000']
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // RASTREO: Clic en el botón de instalar
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'install_btn_click', { 'event_category': 'PWA' });
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      initAudioContext();
      audioRef.current.load();
      audioRef.current.play();
      
      // RASTREO: Play en la radio
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'play_radio', {
          'event_category': 'Player',
          'song': metadata.title
        });
      }
    }
    setIsPlaying(!isPlaying);
  };

  const playSabor = () => {
    if (cowbellRef.current) {
      cowbellRef.current.currentTime = 0;
      cowbellRef.current.play();
      
      // RASTREO: Uso del cencerro
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'cowbell_hit', { 'event_category': 'Interaction' });
      }

      setIsCencerroShaking(true);
      setTimeout(() => setIsCencerroShaking(false), 300);
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, colors: ['#dd9933', '#ffffff'] });
    }
  };

  // ... (Sigue el resto de la lógica de metadata y renderizado)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 space-y-8">
      {/* Header con Botón de Instalación y Rastreos */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-[#dd9933] rounded-xl flex items-center justify-center shadow-lg">
            <Bell className="text-white w-6 h-6" />
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <AnimatePresence>
            {showInstallButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleInstallClick}
                className="flex items-center gap-2 bg-[#dd9933] text-black px-4 py-2 rounded-full font-bold text-[10px] shadow-xl active:scale-95 transition-transform"
              >
                <MonitorSmartphone size={14} />
                <span>INSTALAR APP</span>
              </motion.button>
            )}
          </AnimatePresence>

          <button onClick={() => setShowAlarms(true)} className="p-3 rounded-full bg-zinc-900/80 border border-white/5"><AlarmClock size={20} /></button>
          <button onClick={() => setShowHistory(true)} className="p-3 rounded-full bg-zinc-900/80 border border-white/5"><History size={20} /></button>
        </div>
      </div>

      {/* Cuerpo del reproductor (Vinyl, Visualizer, etc.) */}
      <motion.div
        animate={isCencerroShaking ? { x: [0, -4, 4, -4, 4, 0] } : {}}
        className="z-10"
      >
        <VinylRecord isPlaying={isPlaying} coverUrl={metadata.coverUrl} />
      </motion.div>

      <div className="w-full max-w-xs h-20 flex items-end justify-center z-10">
        <Visualizer analyser={analyser} isPlaying={isPlaying} color={isFiestaMode ? "#ffffff" : "#dd9933"} />
      </div>

      <div className="text-center z-10">
        <h2 className="text-2xl font-black uppercase">{metadata.title}</h2>
        <p className="text-[#dd9933] font-bold uppercase tracking-widest text-sm">{metadata.artist}</p>
      </div>

      <div className="flex items-center gap-6 z-10">
        <button onClick={() => setIsFiestaMode(!isFiestaMode)} className={cn("p-4 rounded-2xl", isFiestaMode ? "bg-[#dd9933]" : "bg-zinc-900")}><Zap size={24} /></button>
        <button onClick={handleTogglePlay} className="w-20 h-20 rounded-full bg-[#dd9933] flex items-center justify-center shadow-2xl">{isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}</button>
        <button onClick={playSabor} className="p-4 rounded-2xl bg-zinc-900"><Mic2 size={24} /></button>
      </div>

      <audio ref={audioRef} src={STREAM_URL} crossOrigin="anonymous" />
      <audio ref={cowbellRef} src="./sounds/cowbell.ogg" crossOrigin="anonymous" />
    </div>
  );
}
