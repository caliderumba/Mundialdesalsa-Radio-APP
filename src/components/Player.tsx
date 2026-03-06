import React, { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Pause, 
  History, 
  AlarmClock, 
  Bell,
  Zap,
  Mic2,
  MonitorSmartphone,
  Download,
  Share2,      // Nuevo
  Instagram,   // Nuevo
  Facebook,    // Nuevo
  Youtube,     // Nuevo
  Globe        // Nuevo
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VinylRecord } from "./VinylRecord";
import { Visualizer } from "./Visualizer";
import { cn } from "@/src/lib/utils";
import { format } from "date-fns";
import confetti from "canvas-confetti";

// Firebase Imports
import { messaging } from "../firebase-config"; 
import { getToken, onMessage } from "firebase/messaging";

// Declaración para Google Analytics
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
const VAPID_KEY = "BB96feZebT300xmBryJSxCpA2ecbPGhBOdZYslyqOQLdIScS4V_80TLi4O9lYBMvcYTg59yhCXCJB6AlpzAzhTA";

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
  // --- ESTADOS ---
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isCencerroShaking, setIsCencerroShaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const cowbellRef = useRef<HTMLAudioElement>(null);

  // --- AUDIO CONTEXT ---
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

  // --- EFECTO: PWA E INSTALACIÓN ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'pwa_offer_view', { 'event_category': 'PWA' });
      }
    };

    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'pwa_install_success', { 'event_category': 'PWA' });
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

  // --- EFECTO: NOTIFICACIONES FIREBASE ---
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const registration = await navigator.serviceWorker.register(
            "/Mundialdesalsa-Radio-APP/firebase-messaging-sw.js"
          );

          const token = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration 
          });

          if (token) {
            console.log("Token PUSH listo:", token);
          }
        }
      } catch (error) {
        console.error("Error en Firebase PWA:", error);
      }
    };

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Mensaje recibido:", payload);
    });

    setupNotifications();
    return () => unsubscribe();
  }, []);

  // --- ACCIONES ---
  const handleShare = async () => {
    const shareData = {
      title: 'Mundial de Salsa Radio',
      text: 'Escucha la mejor salsa del mundo desde Cali. ¡Azótale baldosa!',
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Enlace copiado al portapapeles');
      }
    } catch (err) {
      console.log('Error al compartir:', err);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
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
    }
    setIsPlaying(!isPlaying);
  };

  const playSabor = () => {
    if (cowbellRef.current) {
      cowbellRef.current.currentTime = 0;
      cowbellRef.current.play();
      setIsCencerroShaking(true);
      setTimeout(() => setIsCencerroShaking(false), 300);
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, colors: ['#dd9933', '#ffffff'] });
    }
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 space-y-8">
      {/* Header */}
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

          <button onClick={() => setShowAlarms(true)} className="p-3 rounded-full bg-zinc-900/80 border border-white/5 shadow-lg backdrop-blur-md">
            <AlarmClock size={20} />
          </button>
          <button onClick={() => setShowHistory(true)} className="p-3 rounded-full bg-zinc-900/80 border border-white/5 shadow-lg backdrop-blur-md">
            <History size={20} />
          </button>
        </div>
      </div>

      {/* Disco Vinilo */}
      <motion.div
        animate={isCencerroShaking ? { x: [0, -4, 4, -4, 4, 0] } : {}}
        transition={{ duration: 0.2 }}
        className="z-10"
      >
        <VinylRecord isPlaying={isPlaying} coverUrl={metadata.coverUrl} />
      </motion.div>

      {/* Visualizador */}
      <div className="w-full max-w-xs h-20 flex items-end justify-center z-10">
        <Visualizer analyser={analyser} isPlaying={isPlaying} color={isFiestaMode ? "#ffffff" : "#dd9933"} />
      </div>

      {/* Metadata */}
      <div className="text-center z-10">
        <h2 className="text-2xl font-black uppercase tracking-tight">{metadata.title}</h2>
        <p className="text-[#dd9933] font-bold uppercase tracking-widest text-sm">{metadata.artist}</p>
      </div>

      {/* Controles Principales */}
      <div className="flex items-center gap-6 z-10">
        <button 
          onClick={() => setIsFiestaMode(!isFiestaMode)} 
          className={cn("p-4 rounded-2xl transition-all", isFiestaMode ? "bg-[#dd9933] shadow-[0_0_20px_rgba(221,153,51,0.4)]" : "bg-zinc-900")}
        >
          <Zap size={24} className={isFiestaMode ? "animate-pulse" : ""} />
        </button>

        <button 
          onClick={handleTogglePlay} 
          className="w-20 h-20 rounded-full bg-[#dd9933] flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
        >
          {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
        </button>

        <button onClick={playSabor} className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 transition-colors">
          <Mic2 size={24} />
        </button>
      </div>

      {/* REDES SOCIALES Y COMPARTIR */}
      <div className="flex flex-col items-center gap-6 z-10 w-full pt-4">
        <div className="flex gap-6">
          <a href="https://www.instagram.com/mundialdesalsa" target="_blank" rel="noopener noreferrer" className="hover:text-[#dd9933] transition-colors">
            <Instagram size={24} />
          </a>
          <a href="https://www.facebook.com/mundialdesalsa" target="_blank" rel="noopener noreferrer" className="hover:text-[#dd9933] transition-colors">
            <Facebook size={24} />
          </a>
          <a href="https://www.youtube.com/@mundialdesalsa" target="_blank" rel="noopener noreferrer" className="hover:text-[#dd9933] transition-colors">
            <Youtube size={24} />
          </a>
          <a href="https://mundialdesalsa.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#dd9933] transition-colors">
            <Globe size={24} />
          </a>
        </div>

        <button 
          onClick={handleShare}
          className="flex items-center gap-2 bg-zinc-900/50 border border-white/10 px-6 py-3 rounded-full hover:bg-zinc-800 transition-all active:scale-95"
        >
          <Share2 size={18} className="text-[#dd9933]" />
          <span className="text-[10px] font-bold tracking-widest uppercase">Compartir Radio</span>
        </button>
      </div>

      <audio ref={audioRef} src={STREAM_URL} crossOrigin="anonymous" />
      <audio ref={cowbellRef} src="./sounds/cowbell.ogg" crossOrigin="anonymous" />
    </div>
  );
}
