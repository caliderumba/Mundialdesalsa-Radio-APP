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

// Firebase Imports
import { messaging } from "../firebase-config"; 
import { getToken } from "firebase/messaging";

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
  coverUrl: string;
  timestamp: number;
}

interface Alarm {
  id: string;
  time: string;
  enabled: boolean;
}

export function Player() {
  // --- ESTADOS ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [metadata, setMetadata] = useState<SongMetadata>({
    id: "1",
    title: "Mundial de Salsa",
    artist: "Cali - Colombia",
    coverUrl: FALLBACK_COVER_URL,
    timestamp: Date.now()
  });
  
  const [history, setHistory] = useState<SongMetadata[]>(() => {
    const saved = localStorage.getItem("radio_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    const saved = localStorage.getItem("radio_alarms");
    return saved ? JSON.parse(saved) : [];
  });

  const [lyrics, setLyrics] = useState<string>("");
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

  // --- AUDIO MOTOR ---
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

  // --- BUSCAR LETRAS ---
  const fetchLyrics = async (artist: string, title: string) => {
    setLoadingLyrics(true);
    setLyrics("");
    try {
      const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
      const data = await res.json();
      setLyrics(data.lyrics || "No se encontró la letra de esta canción. ¡A improvisar el soneo!");
    } catch (e) {
      setLyrics("Error al conectar con el servidor de letras.");
    } finally {
      setLoadingLyrics(false);
    }
  };

  // --- EFECTO: METADATOS Y EVENTOS ---
  useEffect(() => {
    const eventSource = new EventSource(ZENO_METADATA_URL);
    eventSource.onmessage = async (event) => {
      try {
        const raw = JSON.parse(event.data);
        const fullTitle = raw.streamTitle || "Mundial de Salsa - Cali";
        const partes = fullTitle.split("-").map((s: string) => s.trim());
        const artista = partes[0] || "Mundial de Salsa";
        const cancion = partes[1] || "En Vivo";

        if (cancion !== metadata.title) {
          updateTrack(artista, cancion);
        }
      } catch (err) { console.error(err); }
    };

    async function updateTrack(artista: string, cancion: string) {
      let cover = FALLBACK_COVER_URL;
      try {
        const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${API_KEY_LASTFM}&artist=${encodeURIComponent(artista)}&track=${encodeURIComponent(cancion)}&format=json`);
        const data = await res.json();
        const imgUrl = data.track?.album?.image?.find((i: any) => i.size === "extralarge")?.["#text"];
        if (imgUrl && imgUrl !== "") cover = imgUrl;
      } catch (e) { }

      const newSong: SongMetadata = { id: Date.now().toString(), title: cancion, artist: artista, coverUrl: cover, timestamp: Date.now() };
      setMetadata(newSong);
      
      if (showLyrics) fetchLyrics(artista, cancion);

      setHistory(prev => {
        const updated = [newSong, ...prev].slice(0, 15);
        localStorage.setItem("radio_history", JSON.stringify(updated));
        return updated;
      });

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: cancion, artist: artista, album: 'Mundial de Salsa Radio',
          artwork: [{ src: cover, sizes: '512x512', type: 'image/webp' }]
        });
      }
    }
    return () => eventSource.close();
  }, [metadata.title, showLyrics]);

  // --- ALARMAS Y AUDIO ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      alarms.forEach(alarm => {
        if (alarm.enabled && alarm.time === currentTime && !isPlaying) handleTogglePlay();
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [alarms, isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else { initAudioContext(); audioRef.current.play(); }
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

  const handleShare = async () => {
    const msg = `🎶 Escuchando: ${metadata.title} - ${metadata.artist}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Mundial de Salsa', text: msg, url: window.location.href }); } catch (e) {}
    } else {
      await navigator.clipboard.writeText(msg + " " + window.location.href);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.9 }, colors: ['#dd9933', '#ffffff'] });
      alert("Enlace copiado");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 space-y-8 overflow-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <div className="w-10 h-10 bg-[#dd9933] rounded-xl flex items-center justify-center shadow-lg"><Bell className="text-white w-6 h-6" /></div>
        <div className="flex items-center space-x-3">
          <button onClick={() => { setShowLyrics(true); fetchLyrics(metadata.artist, metadata.title); }} className="p-3 rounded-full bg-zinc-900/80 border border-white/5 backdrop-blur-md hover:text-[#dd9933]"><FileText size={20} /></button>
          <button onClick={() => setShowAlarms(true)} className="p-3 rounded-full bg-zinc-900/80 border border-white/5 backdrop-blur-md hover:text-[#dd9933]"><AlarmClock size={20} /></button>
          <button onClick={() => setShowHistory(true)} className="p-3 rounded-full bg-zinc-900/80 border border-white/5 backdrop-blur-md hover:text-[#dd9933]"><History size={20} /></button>
        </div>
      </div>

      <motion.div animate={isCencerroShaking ? { x: [0, -4, 4, -4, 4, 0] } : {}} className="z-10">
        <VinylRecord isPlaying={isPlaying} coverUrl={metadata.coverUrl} />
      </motion.div>

      <div className="w-full max-w-xs h-20 flex items-end justify-center z-10">
        <Visualizer analyser={analyser} isPlaying={isPlaying} color={isFiestaMode ? "#ffffff" : "#dd9933"} />
      </div>

      <div className="text-center z-10 px-4">
        <h2 className="text-2xl font-black uppercase tracking-tight line-clamp-1">{metadata.title}</h2>
        <p className="text-[#dd9933] font-bold uppercase tracking-widest text-sm line-clamp-1">{metadata.artist}</p>
      </div>

      <div className="flex items-center gap-4 w-full max-w-xs bg-zinc-900/40 p-3 rounded-2xl border border-white/5 z-10">
        <button onClick={() => setIsMuted(!isMuted)} className="text-white/70 hover:text-[#dd9933]">{isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#dd9933]" />
      </div>

      <div className="flex items-center gap-6 z-10">
        <button onClick={() => setIsFiestaMode(!isFiestaMode)} className={cn("p-4 rounded-2xl transition-all", isFiestaMode ? "bg-[#dd9933] shadow-lg" : "bg-zinc-900")}><Zap size={24} className={isFiestaMode ? "animate-pulse" : ""} /></button>
        <button onClick={handleTogglePlay} className="w-20 h-20 rounded-full bg-[#dd9933] flex items-center justify-center shadow-2xl active:scale-95 transition-transform">{isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}</button>
        <button onClick={playSabor} className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800"><Mic2 size={24} /></button>
      </div>

      <div className="flex flex-col items-center gap-6 z-10 w-full">
        <div className="flex gap-6 text-white/70">
          <a href="https://instagram.com/mundialdesalsa" target="_blank"><Instagram size={24} /></a>
          <a href="https://facebook.com/mundialdesalsa" target="_blank"><Facebook size={24} /></a>
          <a href="https://youtube.com/@mundialdesalsa" target="_blank"><Youtube size={24} /></a>
          <a href="https://mundialdesalsa.com" target="_blank"><Globe size={24} /></a>
        </div>
        <button onClick={handleShare} className="flex items-center gap-2 bg-zinc-900/50 border border-white/10 px-8 py-3 rounded-full hover:bg-zinc-800 active:scale-95"><Share2 size={18} className="text-[#dd9933]" /><span className="text-[10px] font-bold tracking-widest uppercase">Compartir Radio</span></button>
      </div>

      {/* MODAL: LETRAS (Con efecto Vidrio Esmerilado) */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 bg-black/60 z-[110] p-6 flex flex-col backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black uppercase text-[#dd9933]">Letras</h3>
                <p className="text-xs text-zinc-300">{metadata.title} - {metadata.artist}</p>
              </div>
              <button onClick={() => setShowLyrics(false)} className="p-2 bg-zinc-900/80 rounded-full backdrop-blur-sm"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto bg-zinc-950/40 p-5 rounded-2xl border border-white/5 italic text-zinc-100 leading-relaxed whitespace-pre-wrap text-center backdrop-blur-sm">
              {loadingLyrics ? <div className="flex flex-col items-center justify-center h-full gap-2"><div className="w-8 h-8 border-4 border-[#dd9933] border-t-transparent rounded-full animate-spin"></div><p className="text-xs">Buscando el pregón...</p></div> : lyrics}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: HISTORIAL (Con efecto Vidrio Esmerilado) */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 bg-black/60 z-[100] p-6 overflow-y-auto backdrop-blur-xl">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black uppercase">Historial</h3><button onClick={() => setShowHistory(false)} className="p-2 bg-zinc-900/80 rounded-full backdrop-blur-sm"><X /></button></div>
            <div className="space-y-4">{history.map((song) => (<div key={song.id} className="flex items-center gap-4 bg-zinc-950/40 p-3 rounded-xl border border-white/5 backdrop-blur-sm"><img src={song.coverUrl} className="w-12 h-12 rounded-lg object-cover" /><div className="flex-1 min-w-0"><p className="font-bold truncate text-zinc-50">{song.title}</p><p className="text-xs text-[#dd9933] truncate">{song.artist}</p></div><span className="text-[10px] text-zinc-400">{new Date(song.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>))}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: ALARMAS (Con efecto Vidrio Esmerilado) */}
      <AnimatePresence>
        {showAlarms && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 bg-black/60 z-[100] p-6 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black uppercase">Alarmas</h3><button onClick={() => setShowAlarms(false)} className="p-2 bg-zinc-900/80 rounded-full backdrop-blur-sm"><X /></button></div>
            <input type="time" className="w-full p-4 bg-zinc-950/50 rounded-xl text-2xl font-bold mb-6 border border-[#dd9933] accent-[#dd9933] backdrop-blur-sm" onKeyDown={(e) => { if (e.key === 'Enter') { const val = (e.target as any).value; const newAl = { id: Date.now().toString(), time: val, enabled: true }; setAlarms([...alarms, newAl]); localStorage.setItem("radio_alarms", JSON.stringify([...alarms, newAl])); } }} />
            <div className="space-y-4">{alarms.map((alarm) => (<div key={alarm.id} className="flex justify-between items-center bg-zinc-950/40 p-4 rounded-xl border border-white/5 backdrop-blur-sm"><span className="text-3xl font-black text-zinc-50">{alarm.time}</span><button onClick={() => { const up = alarms.filter(a => a.id !== alarm.id); setAlarms(up); localStorage.setItem("radio_alarms", JSON.stringify(up)); }} className="text-red-400 text-xs font-bold px-3 py-1 bg-red-500/10 rounded-lg border border-red-500/20">ELIMINAR</button></div>))}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} src={STREAM_URL} crossOrigin="anonymous" />
      <audio ref={cowbellRef} src="./sounds/cowbell.ogg" crossOrigin="anonymous" />
    </div>
  );
}
