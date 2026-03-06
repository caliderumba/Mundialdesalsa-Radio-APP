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
  Share2,
  Instagram,
  Facebook,
  Youtube,
  Globe,
  Volume2,    // Icono de volumen alto
  Volume1,    // Icono de volumen bajo
  VolumeX     // Icono de Mute
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VinylRecord } from "./VinylRecord";
import { Visualizer } from "./Visualizer";
import { cn } from "@/src/lib/utils";
import confetti from "canvas-confetti";

// Firebase Imports
import { messaging } from "../firebase-config"; 
import { getToken, onMessage } from "firebase/messaging";

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
}

export function Player() {
  // --- ESTADOS ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8); // Volumen inicial al 80%
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [metadata, setMetadata] = useState<SongMetadata>({
    id: "1",
    title: "Mundial de Salsa",
    artist: "Cali - Colombia",
    coverUrl: FALLBACK_COVER_URL,
  });
  const [isFiestaMode, setIsFiestaMode] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
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

  // --- EFECTO: METADATOS (Lógica EventSource) ---
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
          buscarCaratula(artista, cancion);
        }
      } catch (err) { console.error(err); }
    };

    async function buscarCaratula(artista: string, cancion: string) {
      try {
        const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${API_KEY_LASTFM}&artist=${encodeURIComponent(artista)}&track=${encodeURIComponent(cancion)}&format=json`);
        const data = await res.json();
        const imgUrl = data.track?.album?.image?.find((i: any) => i.size === "extralarge")?.["#text"];
        setMetadata({
          id: Date.now().toString(),
          title: cancion,
          artist: artista,
          coverUrl: (imgUrl && imgUrl !== "") ? imgUrl : FALLBACK_COVER_URL
        });
      } catch (e) {
        setMetadata({ id: Date.now().toString(), title: cancion, artist: artista, coverUrl: FALLBACK_COVER_URL });
      }
    }
    return () => eventSource.close();
  }, [metadata.title]);

  // --- EFECTO: CONTROL DE VOLUMEN ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // --- ACCIONES ---
  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(prevVolume || 0.5);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolume(0);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0) setIsMuted(false);
  };

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      initAudioContext();
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 space-y-8">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <div className="w-10 h-10 bg-[#dd9933] rounded-xl flex items-center justify-center shadow-lg">
          <Bell className="text-white w-6 h-6" />
        </div>
        <div className="flex items-center space-x-3">
          <button className="p-3 rounded-full bg-zinc-900/80 border border-white/5 backdrop-blur-md"><AlarmClock size={20} /></button>
          <button className="p-3 rounded-full bg-zinc-900/80 border border-white/5 backdrop-blur-md"><History size={20} /></button>
        </div>
      </div>

      {/* Disco Vinilo */}
      <motion.div animate={isCencerroShaking ? { x: [0, -4, 4, -4, 4, 0] } : {}} className="z-10">
        <VinylRecord isPlaying={isPlaying} coverUrl={metadata.coverUrl} />
      </motion.div>

      {/* Visualizador */}
      <div className="w-full max-w-xs h-20 flex items-end justify-center z-10">
        <Visualizer analyser={analyser} isPlaying={isPlaying} color={isFiestaMode ? "#ffffff" : "#dd9933"} />
      </div>

      {/* Metadata */}
      <div className="text-center z-10 px-4">
        <h2 className="text-2xl font-black uppercase tracking-tight line-clamp-1">{metadata.title}</h2>
        <p className="text-[#dd9933] font-bold uppercase tracking-widest text-sm line-clamp-1">{metadata.artist}</p>
      </div>

      {/* BARRA DE VOLUMEN */}
      <div className="flex items-center gap-4 w-full max-w-xs bg-zinc-900/40 p-3 rounded-2xl border border-white/5 z-10">
        <button onClick={handleToggleMute} className="text-white/70 hover:text-[#dd9933] transition-colors">
          {isMuted || volume === 0 ? <VolumeX size={20} /> : volume < 0.5 ? <Volume1 size={20} /> : <Volume2 size={20} />}
        </button>
        <input 
          type="range" min="0" max="1" step="0.01" 
          value={volume} onChange={handleVolumeChange}
          className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#dd9933]"
        />
      </div>

      {/* Controles Principales */}
      <div className="flex items-center gap-6 z-10">
        <button onClick={() => setIsFiestaMode(!isFiestaMode)} className={cn("p-4 rounded-2xl transition-all", isFiestaMode ? "bg-[#dd9933] shadow-lg" : "bg-zinc-900")}>
          <Zap size={24} className={isFiestaMode ? "animate-pulse" : ""} />
        </button>
        <button onClick={handleTogglePlay} className="w-20 h-20 rounded-full bg-[#dd9933] flex items-center justify-center shadow-2xl active:scale-95 transition-transform">
          {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
        </button>
        <button onClick={playSabor} className="p-4 rounded-2xl bg-zinc-900">
          <Mic2 size={24} />
        </button>
      </div>

      {/* Redes y Compartir */}
      <div className="flex flex-col items-center gap-6 z-10 w-full pt-4">
        <div className="flex gap-6 text-white/70">
          <a href="https://instagram.com/mundialdesalsa" target="_blank" className="hover:text-[#dd9933]"><Instagram size={24} /></a>
          <a href="https://facebook.com/mundialdesalsa" target="_blank" className="hover:text-[#dd9933]"><Facebook size={24} /></a>
          <a href="https://youtube.com/@mundialdesalsa" target="_blank" className="hover:text-[#dd9933]"><Youtube size={24} /></a>
          <a href="https://mundialdesalsa.com" target="_blank" className="hover:text-[#dd9933]"><Globe size={24} /></a>
        </div>
        <button onClick={handleShare} className="flex items-center gap-2 bg-zinc-900/50 border border-white/10 px-8 py-3 rounded-full hover:bg-zinc-800 transition-all active:scale-95">
          <Share2 size={18} className="text-[#dd9933]" />
          <span className="text-[10px] font-bold tracking-widest uppercase">Compartir Radio</span>
        </button>
      </div>

      <audio ref={audioRef} src={STREAM_URL} crossOrigin="anonymous" />
      <audio ref={cowbellRef} src="./sounds/cowbell.ogg" crossOrigin="anonymous" />
    </div>
  );
}
