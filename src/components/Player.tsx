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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Simplificamos el registro: ya no buscamos '/sw.js' manual que daba 404
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setIsSubscribed(!!subscription);
        });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const subscribeToPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const registration = await navigator.serviceWorker.ready;
      const response = await fetch('/api/vapid-public-key');
      const { publicKey } = await response.json();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      setIsSubscribed(true);
    } catch (err) {
      console.error('Failed to subscribe', err);
    }
  };

  const fetchMetadata = async (title: string, artist: string) => {
    try {
      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${API_KEY_LASTFM}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&format=json`
      );
      const data = await response.json();
      const image = data?.track?.album?.image?.find((img: any) => img.size === "extralarge")?.["#text"];
      return { coverUrl: image || FALLBACK_COVER_URL, album: data?.track?.album?.title || "Mundial de Salsa" };
    } catch (err) {
      return { coverUrl: FALLBACK_COVER_URL, album: "Mundial de Salsa" };
    }
  };

  const currentTitleRef = useRef(metadata.title);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    const connect = () => {
      eventSource = new EventSource(ZENO_METADATA_URL);
      eventSource.onmessage = async (event) => {
        let streamTitle = "";
        try {
          const data = JSON.parse(event.data);
          streamTitle = data.streamTitle || data.stream_title || "";
        } catch (e) { streamTitle = event.data; }
        
        if (streamTitle && streamTitle !== currentTitleRef.current) {
          currentTitleRef.current = streamTitle;
          const parts = streamTitle.split("-").map((s: string) => s.trim());
          let artist = parts[0] || "Mundial de Salsa";
          let title = parts[1] || streamTitle;
          const meta = await fetchMetadata(title, artist);
          const newSong: SongMetadata = { id: Date.now().toString(), title, artist, album: meta.album, coverUrl: meta.coverUrl, timestamp: new Date() };
          setMetadata(newSong);
          setHistory((prev) => [newSong, ...prev].slice(0, 50));
        }
      };
      eventSource.onerror = () => { eventSource?.close(); setTimeout(connect, 5000); };
    };
    const t = setTimeout(connect, 1500);
    return () => { clearTimeout(t); eventSource?.close(); };
  }, []);

  useEffect(() => {
    const alarmInterval = setInterval(() => {
      const currentTime = format(new Date(), "HH:mm");
      alarms.forEach(alarm => {
        if (alarm.enabled && alarm.time === currentTime && !isPlaying) {
          handleTogglePlay();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      });
    }, 1000);
    return () => clearInterval(alarmInterval);
  }, [alarms, isPlaying]);

  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title,
        artist: metadata.artist,
        artwork: [{ src: metadata.coverUrl, sizes: "512x512", type: "image/png" }]
      });
    }
  }, [metadata]);

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
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, colors: ['#dd9933', '#ffffff'] });
    }
  };

  const handleShare = async () => {
    const data = { title: "Mundial de Salsa Radio", text: `Escuchando ${metadata.title}`, url: window.location.href };
    if (navigator.share) await navigator.share(data);
    else { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 space-y-8">
      {/* Botones de Cabecera */}
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

      <VinylRecord isPlaying={isPlaying} coverUrl={metadata.coverUrl} />
      <Visualizer analyser={analyser} isPlaying={isPlaying} color={isFiestaMode ? "#ffffff" : "#dd9933"} />

      <div className="text-center z-10 max-w-xs">
        <h2 className="text-2xl font-black uppercase">{metadata.title}</h2>
        <p className="text-[#dd9933] font-bold uppercase tracking-widest">{metadata.artist}</p>
      </div>

      <div className="flex items-center gap-6 z-10">
        <button onClick={() => setIsFiestaMode(!isFiestaMode)} className={cn("p-4 rounded-2xl", isFiestaMode ? "bg-[#dd9933]" : "bg-zinc-900")}><Zap size={24} /></button>
        <button onClick={handleTogglePlay} className="w-20 h-20 rounded-full bg-[#dd9933] flex items-center justify-center shadow-2xl">
          {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
        </button>
        <button onClick={playSabor} className="p-4 rounded-2xl bg-zinc-900"><Mic2 size={24} /></button>
      </div>

      {/* ELEMENTOS DE AUDIO CORREGIDOS */}
      <audio ref={audioRef} src={STREAM_URL} crossOrigin="anonymous" />
      
      {/* Corregido: La ruta ahora es solo el string de la ubicación del archivo */}
      <audio ref={cowbellRef} src="./sounds/cowbell.ogg" crossOrigin="anonymous" />

      {/* Modales de Historial y Alarmas (Simplificados para el ejemplo) */}
      <AnimatePresence>
        {showHistory && (
          <motion.div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-zinc-900 p-6 rounded-3xl w-full max-w-lg border border-white/10">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold">Historial</h3>
                 <button onClick={() => setShowHistory(false)}><X /></button>
               </div>
               <div className="max-h-60 overflow-y-auto">
                 {history.map(s => <div key={s.id} className="p-2 border-b border-white/5">{s.title} - {s.artist}</div>)}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
