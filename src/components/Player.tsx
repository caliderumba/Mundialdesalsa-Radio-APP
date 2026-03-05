import React, { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Share2, 
  Facebook, 
  Instagram, 
  Twitter, 
  Volume2, 
  VolumeX, 
  History, 
  AlarmClock, 
  X, 
  Plus, 
  Trash2, 
  Bell,
  Music,
  Zap,
  Mic2,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VinylRecord } from "./VinylRecord";
import { Visualizer } from "./Visualizer";
import { cn } from "@/src/lib/utils";
import { format } from "date-fns";
import confetti from "canvas-confetti";
import { GoogleGenAI } from "@google/genai";

// Declaración para que TypeScript no se queje de Google Analytics
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
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
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
  const [newAlarmTime, setNewAlarmTime] = useState("08:00");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFiestaMode, setIsFiestaMode] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<string>("");
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
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
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    // Detector de instalación exitosa reportando a Google Analytics
    const handleAppInstalled = () => {
      console.log('¡Sabor! Aplicación instalada.');
      
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'pwa_install_success', {
          'event_category': 'PWA',
          'event_label': 'MundialDeSalsa App'
        });
      }

      setShowInstallButton(false);
      setDeferredPrompt(null);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#dd9933', '#ffffff', '#000000']
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        console.log('SW Ready para Google Analytics');
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Tracking de clic en botón instalar
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'install_button_click', {
        'event_category': 'PWA'
      });
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
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
      
      // Tracking de Play
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'play_radio', {
          'event_category': 'Player',
          'song_title': metadata.title
        });
      }
    }
    setIsPlaying(!isPlaying);
  };

  const playSabor = () => {
    if (cowbellRef.current) {
      cowbellRef.current.currentTime = 0;
      cowbellRef.current.play();
      
      // Tracking de Cencerro (Sabor)
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'cowbell_click', {
          'event_category': 'Interaction'
        });
      }

      setIsCencerroShaking(true);
      setTimeout(() => setIsCencerroShaking(false), 300);
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, colors: ['#dd9933', '#ffffff'] });
    }
  };

  // ... (Resto del código de metadata, history y modals que ya tenías) ...

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 space-y-8">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-[#dd9933] rounded-xl flex items-center justify-center shadow-lg">
            <Bell className="text-white w-6 h-6" />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowAlarms(true)} className="p-3 rounded-full bg-zinc-900"><AlarmClock size={20} /></button>
          <button onClick={() => setShowHistory(true)} className="p-3 rounded-full bg-zinc-900"><History size={20} /></button>
          {showInstallButton && (
            <button onClick={handleInstallClick} className="p-3 rounded-full bg-[#dd9933] animate-bounce"><Download size={20} /></button>
          )}
        </div>
      </div>

      {/* Disco */}
      <motion.div
        animate={isCencerroShaking ? { x: [0, -4, 4, -4, 4, 0], rotate: [0, -1, 1, -1, 1, 0] } : {}}
        transition={{ duration: 0.2 }}
        className="z-10"
      >
        <VinylRecord isPlaying={isPlaying} coverUrl={metadata.coverUrl} />
      </motion.div>

      <div className="w-full max-w-xs h-20 flex items-end justify-center z-10">
        <Visualizer analyser={analyser} isPlaying={isPlaying} color={isFiestaMode ? "#ffffff" : "#dd9933"} />
      </div>

      <div className="text-center z-10 max-w-xs">
        <h2 className="text-2xl font-black uppercase tracking-tight">{metadata.title}</h2>
        <p className="text-[#dd9933] font-bold uppercase tracking-widest text-sm">{metadata.artist}</p>
      </div>

      <div className="flex items-center gap-6 z-10">
        <button onClick={() => setIsFiestaMode(!isFiestaMode)} className={cn("p-4 rounded-2xl transition-all", isFiestaMode ? "bg-[#dd9933]" : "bg-zinc-900")}><Zap size={24} /></button>
        <button onClick={handleTogglePlay} className="w-20 h-20 rounded-full bg-[#dd9933] flex items-center justify-center shadow-2xl">{isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}</button>
        <button onClick={playSabor} className="p-4 rounded-2xl bg-zinc-900"><Mic2 size={24} /></button>
      </div>

      <audio ref={audioRef} src={STREAM_URL} crossOrigin="anonymous" />
      <audio ref={cowbellRef} src="./sounds/cowbell.ogg" crossOrigin="anonymous" />
    </div>
  );
}
