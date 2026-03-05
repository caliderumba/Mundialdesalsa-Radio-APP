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
  time: string; // HH:mm
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
  const [showPushAdmin, setShowPushAdmin] = useState(false);
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

  // Initialize Audio Context for Visualizer
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

  // Push Notification Logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered');
          return registration.pushManager.getSubscription();
        })
        .then(subscription => {
          setIsSubscribed(!!subscription);
        })
        .catch(err => console.error('Service Worker registration failed', err));
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const subscribeToPush = async () => {
    try {
      if (!('Notification' in window)) {
        alert('Este navegador no soporta notificaciones de escritorio.');
        return;
      }

      // Check for notification permission first
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        if (window.self !== window.top) {
          alert('Las notificaciones están bloqueadas en el modo vista previa. Por favor, abre la aplicación en una pestaña nueva para poder suscribirte.');
        } else {
          alert('No se concedió permiso para las notificaciones. Por favor, actívalas en la configuración de tu navegador.');
        }
        return;
      }

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
      alert('¡Suscrito a notificaciones!');
    } catch (err) {
      console.error('Failed to subscribe', err);
      alert('Error al suscribirse. Asegúrate de permitir las notificaciones y que tu navegador las soporte.');
    }
  };

  const sendTestNotification = async () => {
    await fetch('/api/notify-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Mundial de Salsa',
        body: '¡Programa especial: Salsa de la Pesada ahora en vivo!',
        url: window.location.href
      })
    });
  };

  // Fetch Cover Art and Metadata from Last.fm
  const fetchMetadata = async (title: string, artist: string) => {
    try {
      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${API_KEY_LASTFM}&artist=${encodeURIComponent(
          artist
        )}&track=${encodeURIComponent(title)}&format=json`
      );
      const data = await response.json();
      const image = data?.track?.album?.image?.find((img: any) => img.size === "extralarge")?.["#text"];
      const album = data?.track?.album?.title;
      return {
        coverUrl: image || FALLBACK_COVER_URL,
        album: album || "Mundial de Salsa"
      };
    } catch (err) {
      console.error("Error fetching metadata:", err);
      return {
        coverUrl: FALLBACK_COVER_URL,
        album: "Mundial de Salsa"
      };
    }
  };

  const currentTitleRef = useRef(metadata.title);

  // Real Metadata Updates from Zeno.fm
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;

    const connect = () => {
      if (eventSource) eventSource.close();
      
      eventSource = new EventSource(ZENO_METADATA_URL);

      eventSource.onmessage = async (event) => {
        try {
          let streamTitle = "";
          try {
            const data = JSON.parse(event.data);
            // Zeno FM uses streamTitle (camelCase) in their EventSource
            streamTitle = data.streamTitle || data.stream_title || "";
          } catch (e) {
            // Fallback for non-JSON data
            streamTitle = event.data;
          }
          
          if (streamTitle && streamTitle !== currentTitleRef.current) {
            currentTitleRef.current = streamTitle;
            
            let artist = "Mundial de Salsa";
            let title = streamTitle;

            // Split logic matching the user's script
            const parts = streamTitle.split("-").map((s: string) => s.trim());
            
            let coverUrl = FALLBACK_COVER_URL;
            let album = "Mundial de Salsa";

            if (parts.length >= 2) {
              artist = parts[0];
              title = parts.slice(1).join("-").trim();
              const meta = await fetchMetadata(title, artist);
              coverUrl = meta.coverUrl;
              album = meta.album;
            }

            const newSong: SongMetadata = {
              id: Date.now().toString(),
              title,
              artist,
              album,
              coverUrl,
              timestamp: new Date(),
            };
            setMetadata(newSong);
            setHistory((prev) => [newSong, ...prev].slice(0, 50));
          }
        } catch (err) {
          console.error("Error parsing metadata:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("EventSource failed, retrying...", err);
        if (eventSource) eventSource.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    };

    // Initial delay like the user's script
    const initialTimeout = setTimeout(connect, 1500);

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(retryTimeout);
      if (eventSource) eventSource.close();
    };
  }, []);

  // Alarm Checker
  useEffect(() => {
    const alarmInterval = setInterval(() => {
      const now = new Date();
      const currentTime = format(now, "HH:mm");

      alarms.forEach(alarm => {
        if (alarm.enabled && alarm.time === currentTime && !isPlaying) {
          handleTogglePlay();
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      });
    }, 1000);

    return () => clearInterval(alarmInterval);
  }, [alarms, isPlaying]);

  useEffect(() => {
    localStorage.setItem("radio_alarms", JSON.stringify(alarms));
  }, [alarms]);

  // Initialize Media Session API
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title,
        artist: metadata.artist,
        album: "Mundial de Salsa Radio",
        artwork: [
          { src: metadata.coverUrl, sizes: "96x96", type: "image/png" },
          { src: metadata.coverUrl, sizes: "128x128", type: "image/png" },
          { src: metadata.coverUrl, sizes: "192x192", type: "image/png" },
          { src: metadata.coverUrl, sizes: "256x256", type: "image/png" },
          { src: metadata.coverUrl, sizes: "384x384", type: "image/png" },
          { src: metadata.coverUrl, sizes: "512x512", type: "image/png" },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => handleTogglePlay());
      navigator.mediaSession.setActionHandler("pause", () => handleTogglePlay());
      navigator.mediaSession.setActionHandler("stop", () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      });
    }
  }, [metadata]);

  // Sync isPlaying state with Media Session
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      initAudioContext();
      if (audioContext?.state === 'suspended') {
        audioContext.resume();
      }
      // For live streams, it's often better to reload to get the latest chunk
      audioRef.current.load();
      audioRef.current.play().catch((err) => {
        console.error("Error playing audio:", err);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const playSabor = () => {
    if (cowbellRef.current) {
      cowbellRef.current.currentTime = 0;
      cowbellRef.current.play().catch(err => console.error("Error playing cowbell:", err));
      
      // Visual feedback
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#dd9933', '#ffffff', '#ffcc00']
      });
    }
  };

  const fetchLyrics = async (title: string, artist: string) => {
    if (title === "Mundial de Salsa" || !title) return;
    setIsLoadingLyrics(true);
    setLyrics("");
    try {
      // Try lyrics.ovh first
      const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.lyrics) {
          setLyrics(data.lyrics);
          setIsLoadingLyrics(false);
          return;
        }
      }
      
      // If lyrics.ovh fails or returns no lyrics, use Gemini as fallback
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      const prompt = `Proporciona la letra de la canción "${title}" del artista "${artist}". Devuelve solo la letra, sin introducciones ni comentarios adicionales. Si no conoces la letra exacta, indica que no está disponible de forma amable.`;
      
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      
      const aiLyrics = result.text;
      if (aiLyrics) {
        setLyrics(aiLyrics);
      } else {
        setLyrics("No se encontraron letras para esta canción. ¡A bailar igual!");
      }
    } catch (err) {
      // Silent error for the first fetch, try Gemini as fallback
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = "gemini-3-flash-preview";
        const prompt = `Proporciona la letra de la canción "${title}" del artista "${artist}". Devuelve solo la letra.`;
        const result = await ai.models.generateContent({ model, contents: prompt });
        if (result.text) {
          setLyrics(result.text);
        } else {
          setLyrics("No se encontraron letras para esta canción. ¡A bailar igual!");
        }
      } catch (aiErr) {
        console.error("Error fetching lyrics with Gemini:", aiErr);
        setLyrics("Error al cargar las letras. Inténtalo de nuevo más tarde.");
      }
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  useEffect(() => {
    if (showLyrics) {
      fetchLyrics(metadata.title, metadata.artist);
    }
  }, [showLyrics, metadata.title, metadata.artist]);

  const handleToggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "Mundial de Salsa Radio",
      text: `Escuchando ${metadata.title} - ${metadata.artist} en Mundial de Salsa Radio`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Error sharing:", err);
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      // We could use a toast here, but for now let's use a simple notification
      // or just trust the user sees the interaction.
      // I'll add a simple state for "Copied" feedback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 space-y-8">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-[#dd9933] rounded-xl flex items-center justify-center shadow-lg shadow-[#dd9933]/20">
            <Bell className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase hidden sm:block">Mundial de Salsa</span>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowAlarms(true)}
            className="p-3 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-all relative"
          >
            <AlarmClock size={20} />
            {alarms.some(a => a.enabled) && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#dd9933] rounded-full animate-pulse" />
            )}
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className="p-3 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-all"
          >
            <History size={20} />
          </button>
          
          {showInstallButton && (
            <button 
              onClick={handleInstallClick}
              className="p-3 rounded-full bg-[#dd9933] text-white hover:bg-[#dd9933]/80 transition-all animate-bounce shadow-lg shadow-[#dd9933]/20"
              title="Instalar Aplicación"
            >
              <Download size={20} />
            </button>
          )}

          <button 
            onClick={isSubscribed ? sendTestNotification : subscribeToPush}
            className={cn(
              "p-3 rounded-full transition-all",
              isSubscribed ? "bg-[#dd9933] text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            )}
            title={isSubscribed ? "Enviar notificación de prueba" : "Suscribirse a notificaciones"}
          >
            <Bell size={20} />
          </button>
        </div>
      </div>

      {/* Background Glow & Effects */}
      <div className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none transition-colors duration-1000",
        isFiestaMode && isPlaying ? "bg-zinc-950" : "bg-black"
      )}>
        {isFiestaMode && isPlaying ? (
          <>
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.3, 0.1],
                backgroundColor: ['#dd9933', '#ff0000', '#00ff00', '#0000ff', '#dd9933']
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-1/4 -left-20 w-[600px] h-[600px] blur-[120px] rounded-full" 
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.1, 0.3, 0.1],
                backgroundColor: ['#0000ff', '#dd9933', '#ff0000', '#00ff00', '#0000ff']
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] blur-[120px] rounded-full" 
            />
          </>
        ) : (
          <>
            <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-[#dd9933]/5 blur-[100px] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-[#dd9933]/5 blur-[100px] rounded-full animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#dd9933]/10 blur-[150px] rounded-full" />
          </>
        )}
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10"
      >
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-[#dd9933] drop-shadow-[0_0_15px_rgba(221,153,51,0.4)]">
          Mundial de Salsa
        </h1>
        <p className="text-[#dd9933] text-xs md:text-sm font-black uppercase tracking-[0.3em] mt-3 bg-zinc-900/80 px-4 py-1.5 rounded-full border border-[#dd9933]/30 shadow-[0_0_20px_rgba(221,153,51,0.1)] inline-block">
          LA CAPITAL MUNDIAL DE LA SALSA
        </p>
      </motion.div>

      {/* Vinyl Section */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <VinylRecord isPlaying={isPlaying} coverUrl={metadata.coverUrl} />
        
        {/* Visualizer */}
        <div className="w-full max-w-xs h-24 flex items-end justify-center">
          <Visualizer analyser={analyser} isPlaying={isPlaying} color={isFiestaMode ? "#ffffff" : "#dd9933"} />
        </div>
      </div>

      {/* Metadata Section */}
      <motion.div
        key={metadata.title}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center z-10 max-w-xs"
      >
        <h2 className="text-2xl font-black truncate text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] uppercase tracking-tight">
          {metadata.title}
        </h2>
        <p className="text-[#dd9933] font-bold uppercase tracking-widest text-sm mt-1 drop-shadow-[0_0_8px_rgba(221,153,51,0.3)]">
          {metadata.artist}
        </p>
        {metadata.album && metadata.album !== metadata.title && (
          <p className="text-zinc-400 font-medium italic text-xs mt-1 truncate">
            {metadata.album}
          </p>
        )}
      </motion.div>

      {/* Controls Section */}
      <div className="relative z-10 w-full max-w-md px-6 space-y-8">
        {/* Main Controls */}
        <div className="flex items-center justify-between gap-4">
          <button 
            onClick={() => setIsFiestaMode(!isFiestaMode)}
            className={cn(
              "p-4 rounded-2xl transition-all shadow-lg border",
              isFiestaMode ? "bg-[#dd9933] text-white border-[#dd9933]" : "bg-zinc-900/50 text-zinc-400 border-white/5 hover:bg-zinc-800"
            )}
            title="Modo Fiesta"
          >
            <Zap size={24} className={cn(isFiestaMode && "animate-bounce")} />
          </button>

          <button
            onClick={handleTogglePlay}
            className={cn(
              "w-20 h-20 rounded-full bg-[#dd9933] text-white flex items-center justify-center shadow-[0_0_30px_rgba(221,153,51,0.4)] hover:scale-105 active:scale-95 transition-all group",
              !isPlaying && "animate-pulse"
            )}
          >
            {isPlaying ? (
              <Pause size={36} fill="currentColor" />
            ) : (
              <Play size={36} fill="currentColor" className="ml-1" />
            )}
          </button>

          <button 
            onClick={playSabor}
            className="p-4 rounded-2xl bg-zinc-900/50 text-zinc-400 border border-white/5 hover:bg-zinc-800 transition-all shadow-lg group"
            title="¡Sabor! (Cencerro)"
          >
            <Mic2 size={24} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-center gap-6">
          <button 
            onClick={() => setShowLyrics(true)}
            className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#dd9933] transition-colors"
          >
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
              <Music size={20} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest">Letras</span>
          </button>

          <button 
            onClick={handleShare}
            className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#dd9933] transition-colors relative"
          >
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
              <Share2 size={20} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest">Compartir</span>
            {copied && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#dd9933] text-white text-[8px] font-bold py-1 px-2 rounded whitespace-nowrap animate-bounce">
                ¡COPIADO!
              </span>
            )}
          </button>

          <div className="flex items-center gap-3 bg-zinc-900/50 px-4 py-2 rounded-2xl border border-white/5">
            <button onClick={handleToggleMute} className="text-[#dd3333] hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#dd3333]"
            />
          </div>
        </div>
      </div>

        {/* Social Links */}
        <div className="flex items-center space-x-8 pt-6">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-center text-[#dd9933] hover:bg-[#dd9933] hover:text-white hover:scale-110 transition-all shadow-lg group"
          >
            <Facebook size={24} className="group-hover:rotate-12 transition-transform" />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-center text-[#dd9933] hover:bg-[#dd9933] hover:text-white hover:scale-110 transition-all shadow-lg group"
          >
            <Instagram size={24} className="group-hover:rotate-12 transition-transform" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-center text-[#dd9933] hover:bg-[#dd9933] hover:text-white hover:scale-110 transition-all shadow-lg group"
          >
            <Twitter size={24} className="group-hover:rotate-12 transition-transform" />
          </a>
        </div>

      {/* Hidden Audio Elements */}
      <audio
        ref={audioRef}
        src={STREAM_URL}
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <audio
        ref={cowbellRef}
        src="const cowbellSound = new Audio('./sounds/cowbell.ogg');"
        crossOrigin="anonymous"
      />

      {/* Modals */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md">
                <div className="flex flex-col">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                    <Music className="w-5 h-5 text-[#dd9933]" />
                    Letras
                  </h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">{metadata.title} - {metadata.artist}</p>
                </div>
                <button onClick={() => setShowLyrics(false)} className="p-2 hover:bg-white/5 rounded-full text-zinc-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto p-8 text-center">
                {isLoadingLyrics ? (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <div className="w-8 h-8 border-4 border-[#dd9933] border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-500 font-medium italic">Buscando el sentimiento...</p>
                  </div>
                ) : (
                  <div className="whitespace-pre-line text-zinc-300 leading-relaxed font-serif text-lg italic">
                    {lyrics}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-zinc-900/50 text-center">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Powered by Lyrics.ovh</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-zinc-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <History className="w-5 h-5 text-[#dd9933]" />
                  Historial
                </h3>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/5 rounded-full text-zinc-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">No hay canciones en el historial</div>
                ) : (
                  history.map((song) => (
                    <div key={song.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors group">
                      <img src={song.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{song.title}</h4>
                        <p className="text-sm text-zinc-400">{song.artist}</p>
                        {song.album && song.album !== song.title && (
                          <p className="text-[10px] text-zinc-500 italic">{song.album}</p>
                        )}
                      </div>
                      <span className="text-xs text-zinc-600 font-mono">
                        {format(song.timestamp, "HH:mm")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAlarms && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-zinc-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Bell className="w-5 h-5 text-[#dd9933]" />
                  Despertador
                </h3>
                <button onClick={() => setShowAlarms(false)} className="p-2 hover:bg-white/5 rounded-full text-zinc-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex gap-4">
                  <input 
                    type="time" 
                    value={newAlarmTime}
                    onChange={(e) => setNewAlarmTime(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-white/10 rounded-2xl p-4 text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <button 
                    onClick={() => {
                      const newAlarm: Alarm = {
                        id: Date.now().toString(),
                        time: newAlarmTime,
                        enabled: true
                      };
                      setAlarms([...alarms, newAlarm]);
                    }}
                    className="bg-[#dd9933] text-white p-4 rounded-2xl hover:opacity-90 transition-colors"
                  >
                    <Plus size={32} />
                  </button>
                </div>

                <div className="space-y-3">
                  {alarms.map(alarm => (
                    <div key={alarm.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl">
                      <div className="flex flex-col">
                        <span className="text-3xl font-bold text-white">{alarm.time}</span>
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Todos los días</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setAlarms(alarms.map(a => a.id === alarm.id ? { ...a, enabled: !a.enabled } : a))}
                          className={cn(
                            "w-12 h-6 rounded-full transition-colors relative",
                            alarm.enabled ? "bg-[#dd9933]" : "bg-zinc-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            alarm.enabled ? "left-7" : "left-1"
                          )} />
                        </button>
                        <button 
                          onClick={() => setAlarms(alarms.filter(a => a.id !== alarm.id))}
                          className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="pt-8 z-10">
        <a 
          href="https://caliderumba.mundialdesalsa.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[#dd9933] hover:text-white transition-colors text-xs font-mono uppercase tracking-widest font-bold"
        >
          &copy; {new Date().getFullYear()} Mundial de Salsa Radio
        </a>
      </div>
    </div>
  );
}
