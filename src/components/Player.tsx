import React, { useState, useRef, useEffect } from "react";
import { 
  Play, Pause, History, AlarmClock, Bell, Zap, Mic2, MonitorSmartphone,
  Share2, Instagram, Facebook, Youtube, Globe, Volume2, Volume1, VolumeX, X,
  FileText 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VinylRecord } from "./VinylRecord";
import { Visualizer } from "./Visualizer";
import { cn } from "@/src/lib/utils";
import confetti from "canvas-confetti";

// Constants
const STREAM_URL = "https://stream.zeno.fm/kkertu70mm5tv";
const ZENO_METADATA_URL = "https://api.zeno.fm/mounts/metadata/subscribe/kkertu70mm5tv";
const API_KEY_LASTFM = "f5039be7c53bb811b439652bc75ced48";
const FALLBACK_COVER_URL = "https://mundialdesalsa.com/wp-content/uploads/2023/12/Mundialdesalsa2026.webp";
// Tu clave pública VAPID del servidor
const VAPID_PUBLIC_KEY = "BPzkZUS_fjliAVsX9WeRhmoA1lpcDgPzgtxrW_y1PIkJbLg0yJOobmWKJNQMftxVypjdB53z6FKp2c-SxB3I1FY";

interface SongMetadata {
  id: string; title: string; artist: string; coverUrl: string; timestamp: number;
}
interface Alarm { id: string; time: string; enabled: boolean; }

export function Player() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [metadata, setMetadata] = useState<SongMetadata>({
    id: "1", title: "Mundial de Salsa", artist: "Cali - Colombia",
    coverUrl: FALLBACK_COVER_URL, timestamp: Date.now()
  });
  
  const [history, setHistory] = useState<SongMetadata[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem("radio_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem("radio_alarms");
    return saved ? JSON.parse(saved) : [];
  });

  const [lyrics, setLyrics] = useState("");
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAlarms, setShowAlarms] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isFiestaMode, setIsFiestaMode] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isCencerroShaking, setIsCencerroShaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const cowbellRef = useRef<HTMLAudioElement>(null);

  // --- LÓGICA DE NOTIFICACIONES PUSH ---
  const subscribeToNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Necesitamos tu permiso para avisarte de los especiales de salsa.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY
      });

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      alert('¡Sabor! Ahora recibirás nuestras alertas salseras.');
      
    } catch (error) {
      console.error('Error al suscribir:', error);
      alert('Hubo un problema con la suscripción. Intenta desde un móvil o Chrome.');
    }
  };

  // --- LÓGICA DE LETRAS CON FALLBACK A SERVIDOR ---
  const fetchLyrics = async (artist: string, title: string) => {
    if (!title || title === "Mundial de Salsa") return;
    setLoadingLyrics(true);
    setLyrics("");
    
    try {
      const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.lyrics) {
        setLyrics(data.lyrics);
        setLoadingLyrics(false);
        return;
      }
      throw new Error();
    } catch (err) {
      try {
        const aiRes = await fetch('/api/lyrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, artist })
        });
        const aiData = await aiRes.json();
        setLyrics(aiData.lyrics || "Letra no disponible por ahora. ¡A bailar igual!");
      } catch (e) {
        setLyrics("Error al conectar con el servidor de letras.");
      }
    } finally {
      setLoadingLyrics(false);
    }
  };

  useEffect(() => {
    if (showLyrics) fetchLyrics(metadata.artist, metadata.title);
  }, [showLyrics, metadata.title, metadata.artist]);

  // --- METADATA Y PANTALLA DE BLOQUEO ---
  useEffect(() => {
    const eventSource = new EventSource(ZENO_METADATA_URL);
    eventSource.onmessage = async (event) => {
      try {
        const raw = JSON.parse(event.data);
        const [artistaRaw = "Mundial de Salsa", cancionRaw = "En Vivo"] = (raw.streamTitle || "").split(" - ");
        const artista = artistaRaw.trim();
        const cancion = cancionRaw.trim();

        if (cancion !== metadata.title) {
          let cover = FALLBACK_COVER_URL;
          try {
            const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${API_KEY_LASTFM}&artist=${encodeURIComponent(artista)}&track=${encodeURIComponent(cancion)}&format=json`);
            const data = await res.json();
            const imgUrl = data.track?.album?.image?.find((i: any) => i.size === "extralarge")?.["#text"];
            if (imgUrl) cover = imgUrl;
          } catch (e) {}

          const newSong = { id: Date.now().toString(), title: cancion, artist: artista, coverUrl: cover, timestamp: Date.now() };
          setMetadata(newSong);
          
          setHistory(prev => {
            const updated = [newSong, ...prev].slice(0, 15);
            localStorage.setItem("radio_history", JSON.stringify(updated));
            return updated;
          });

          if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: cancion, artist: artista, album: 'Mundial de Salsa',
              artwork: [{ src: cover, sizes: '512x512', type: 'image/webp' }]
            });
          }
        }
      } catch (err) {}
    };
    return () => eventSource.close();
  }, [metadata.title]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // --- SISTEMA DE ALARMA ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      alarms.forEach(a => { 
        if (a.enabled && a.time === timeStr && !isPlaying) {
          handleTogglePlay();
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [alarms, isPlaying]);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else { 
      if (!audioContext) {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const context = new AudioCtx();
        const src = context.createMediaElementSource(audioRef.current);
        const an = context.createAnalyser();
        src.connect(an); an.connect(context.destination);
        setAudioContext(context); setAnalyser(an);
      }
      audioRef.current.play().catch(() => {}); 
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 space-y-8 overflow-hidden">
      {/* Header con Campana Activa */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <button 
          onClick={subscribeToNotifications}
          className="w-10 h-10 bg-[#dd9933] rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
        >
          <Bell className="text-white w-6 h-6" />
        </button>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowLyrics(true)} className="p-3 rounded-full bg-zinc-900/80 border border-white/5 backdrop-blur-md hover:text-[#dd9933] transition-all"><FileText size={20} /></button>
          <button onClick={() => setShowAlarms(true)} className="p-3 rounded-full bg-zinc-900/80 border border-white/5 backdrop-blur-md hover:text-[#dd9933] transition-all"><AlarmClock size={20} /></button>
          <button onClick={() => setShowHistory(true)} className="p-3 rounded-full bg-zinc-900/80 border border-white/5 backdrop-blur-md hover:text-[#dd9933] transition-all"><History size={20} /></button>
        </div>
      </div>

      <motion.div animate={isCencerroShaking ? { x: [0, -4, 4, -4, 4, 0] } : {}} className="z-10">
        <VinylRecord isPlaying={isPlaying} coverUrl={metadata.coverUrl} />
      </motion.div>

      <div className="w-full max-w-xs h-20 flex items-end justify-center z-10 text-[#dd9933]">
        <Visualizer analyser={analyser} isPlaying={isPlaying} color={isFiestaMode ? "#ffffff" : "#dd9933"} />
      </div>

      <div className="text-center z-10 px-4 w-full">
        <h2 className="text-2xl font-black uppercase tracking-tight truncate">{metadata.title}</h2>
        <p className="text-[#dd9933] font-bold uppercase tracking-widest text-sm truncate">{metadata.artist}</p>
      </div>

      {/* Control Volumen */}
      <div className="flex items-center gap-4 w-full max-w-xs bg-zinc-900/40 p-3 rounded-2xl border border-white/5 z-10 backdrop-blur-sm">
        <button onClick={() => { setPrevVolume(volume); setIsMuted(!isMuted); }} className="text-white/70 hover:text-[#dd9933]">
          {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#dd9933]" />
      </div>

      {/* Controles Principales */}
      <div className="flex items-center gap-6 z-10">
        <button onClick={() => setIsFiestaMode(!isFiestaMode)} className={cn("p-4 rounded-2xl transition-all", isFiestaMode ? "bg-[#dd9933] shadow-lg" : "bg-zinc-900")}><Zap size={24} className={isFiestaMode ? "animate-pulse" : ""} /></button>
        <button onClick={handleTogglePlay} className="w-20 h-20 rounded-full bg-[#dd9933] flex items-center justify-center shadow-2xl active:scale-95 transition-transform">{isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}</button>
        <button onClick={() => { if(cowbellRef.current){cowbellRef.current.play(); setIsCencerroShaking(true); setTimeout(()=>setIsCencerroShaking(false), 300); confetti({particleCount:40}); } }} className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 transition-colors"><Mic2 size={24} /></button>
      </div>

      {/* Footer Social */}
      <div className="flex flex-col items-center gap-6 z-10 w-full pt-4 text-white/70">
        <div className="flex gap-6">
          <a href="https://instagram.com/mundialdesalsa" target="_blank" rel="noopener noreferrer" className="hover:text-[#dd9933] transition-colors"><Instagram size={24} /></a>
          <a href="https://facebook.com/mundialdesalsa" target="_blank" rel="noopener noreferrer" className="hover:text-[#dd9933]"><Facebook size={24} /></a>
          <a href="https://youtube.com/@mundialdesalsa" target="_blank" rel="noopener noreferrer" className="hover:text-[#dd9933]"><Youtube size={24} /></a>
          <a href="https://mundialdesalsa.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#dd9933]"><Globe size={24} /></a>
        </div>
        <button onClick={async () => { const msg = `🎶 Escuchando: ${metadata.title} - ${metadata.artist}`; if(navigator.share) await navigator.share({title:'Mundial de Salsa', text:msg, url:window.location.href}); else { await navigator.clipboard.writeText(msg + " " + window.location.href); alert('Link copiado'); } }} className="flex items-center gap-2 bg-zinc-900/50 border border-white/10 px-8 py-3 rounded-full hover:bg-zinc-800 active:scale-95 transition-all shadow-lg"><Share2 size={18} className="text-[#dd9933]" /><span className="text-[10px] font-bold tracking-widest uppercase">Compartir Radio</span></button>
      </div>

      {/* MODALES */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 bg-black/60 z-[110] p-6 flex flex-col backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
              <div><h3 className="text-xl font-black uppercase text-[#dd9933]">Letras</h3><p className="text-xs text-zinc-300">{metadata.title} - {metadata.artist}</p></div>
              <button onClick={() => setShowLyrics(false)} className="p-2 bg-zinc-900/80 rounded-full"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto bg-zinc-950/40 p-5 rounded-2xl border border-white/5 italic text-zinc-100 whitespace-pre-wrap text-center backdrop-blur-sm">
              {loadingLyrics ? <div className="animate-pulse italic text-[#dd9933]">Consultando el pregón con IA...</div> : lyrics}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 bg-black/60 z-[100] p-6 overflow-y-auto backdrop-blur-xl">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black uppercase">Historial</h3><button onClick={() => setShowHistory(false)} className="p-2 bg-zinc-900/80 rounded-full"><X /></button></div>
            <div className="space-y-4">{history.map((song) => (<div key={song.id} className="flex items-center gap-4 bg-zinc-950/40 p-3 rounded-xl border border-white/5 backdrop-blur-sm"><img src={song.coverUrl} className="w-12 h-12 rounded-lg object-cover" alt="cover" /><div className="flex-1 min-w-0"><p className="font-bold truncate text-zinc-50">{song.title}</p><p className="text-xs text-[#dd9933] truncate">{song.artist}</p></div></div>))}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAlarms && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 bg-black/60 z-[100] p-6 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-black uppercase text-[#dd9933]">Despertador Salsero</h3><button onClick={() => setShowAlarms(false)} className="p-2 bg-zinc-900/80 rounded-full"><X /></button></div>
            <div className="mb-6 bg-[#dd9933]/10 border border-[#dd9933]/20 p-4 rounded-xl text-sm text-zinc-200 leading-snug">
               Programa tu hora y despierta con la mejor salsa. La radio sonará sola.<span className="block mt-2 text-[10px] text-zinc-400 italic">* Mantén la app abierta.</span>
            </div>
            <input type="time" className="w-full p-4 bg-zinc-950/50 rounded-xl text-3xl font-black mb-6 border border-[#dd9933] text-center text-white" onKeyDown={(e) => { if (e.key === 'Enter') { const val = (e.target as any).value; const newAl = { id: Date.now().toString(), time: val, enabled: true }; setAlarms([...alarms, newAl]); localStorage.setItem("radio_alarms", JSON.stringify([...alarms, newAl])); } }} />
            <div className="space-y-4">{alarms.map((alarm) => (<div key={alarm.id} className="flex justify-between items-center bg-zinc-950/40 p-4 rounded-xl border border-white/5"><span className="text-3xl font-black text-zinc-50">{alarm.time}</span><button onClick={() => { const up = alarms.filter(a => a.id !== alarm.id); setAlarms(up); localStorage.setItem("radio_alarms", JSON.stringify(up)); }} className="text-red-400 text-xs font-bold px-3 py-1 bg-red-500/10 rounded-lg border border-red-500/20">ELIMINAR</button></div>))}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} src={STREAM_URL} crossOrigin="anonymous" />
      <audio ref={cowbellRef} src="./sounds/cowbell.ogg" crossOrigin="anonymous" />
    </div>
  );
}
