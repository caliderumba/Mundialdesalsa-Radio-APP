import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface VinylRecordProps {
  isPlaying: boolean;
  coverUrl?: string;
  className?: string;
}

export function VinylRecord({ isPlaying, coverUrl, className }: VinylRecordProps) {
  return (
    <div className={cn("relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center", className)}>
      
      {/* Turntable Platter (The base under the vinyl) */}
      <div className="absolute inset-[-12px] rounded-full bg-zinc-900 border-[6px] border-zinc-800 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#dd9933]/5 blur-2xl" />
        <div className="absolute inset-0 rounded-full border-2 border-zinc-700/50 border-dashed opacity-30" />
        <div className="absolute inset-1 rounded-full border border-white/5" />
      </div>

      {/* Vinyl Disc Background */}
      <motion.div
        animate={{ rotate: isPlaying ? 360 : 0 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="relative w-full h-full rounded-full bg-zinc-950 shadow-2xl flex items-center justify-center overflow-hidden border border-zinc-800"
      >
        {/* Vinyl Sheen / Reflection Effect */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[conic-gradient(from_0deg,transparent_0%,white_10%,transparent_20%,transparent_50%,white_60%,transparent_70%)]" />
        
        {/* Grooves */}
        <div className="absolute inset-0 rounded-full border-[12px] border-zinc-800/40" />
        {[4, 8, 12, 16, 20, 24].map((dist) => (
          <div key={dist} className={`absolute inset-${dist} rounded-full border-[1px] border-zinc-700/10`} />
        ))}

        {/* --- CAMBIO AQUÍ: Carátula agrandada al 50% --- */}
        <div className="relative w-1/2 h-1/2 rounded-full bg-zinc-800 overflow-hidden border-2 border-black/50 shadow-[0_0_20px_rgba(0,0,0,0.8)] z-10 flex items-center justify-center">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Album Cover"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#dd9933] text-white font-bold text-3xl">
              MS
            </div>
          )}
          
          {/* Overlay para suavizar la carátula y darle aspecto de papel/etiqueta */}
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />

          {/* Center Hole mejorado */}
          <div className="absolute w-4 h-4 bg-zinc-950 rounded-full border border-zinc-800 shadow-inner z-20" />
        </div>
      </motion.div>

      {/* Tonearm / Needle */}
      <div className="absolute -top-6 -right-6 w-32 h-32 md:-top-10 md:-right-10 md:w-48 md:h-48 pointer-events-none z-20">
        <motion.div
          animate={{ rotate: isPlaying ? 28 : -10 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="relative w-full h-full"
          style={{ transformOrigin: "80% 20%" }}
        >
          {/* Main Arm */}
          <div className="absolute top-[20%] right-[20%] w-[70%] h-1 md:h-2 bg-zinc-300 rounded-full shadow-lg origin-right" 
               style={{ transform: 'rotate(-45deg)' }}>
            
            {/* Headshell */}
            <div className="absolute -left-1 md:-left-2 -top-1 md:-top-2 w-6 h-4 md:w-10 md:h-6 bg-zinc-800 rounded-sm border border-zinc-600 flex items-center justify-center">
              <div className="w-0.5 h-2 md:w-1 md:h-4 bg-[#dd9933] rounded-full shadow-[0_0_8px_#dd9933]" />
            </div>

            {/* Counterweight */}
            <div className="absolute -right-2 md:-right-4 -top-1 md:-top-2 w-5 h-4 md:w-8 md:h-6 bg-zinc-700 rounded-md border border-zinc-500" />
          </div>

          {/* Pivot Base */}
          <div className="absolute top-[15%] right-[15%] w-8 h-8 md:w-12 md:h-12 bg-zinc-900 rounded-full border-2 md:border-4 border-zinc-800 shadow-2xl flex items-center justify-center">
            <div className="w-2 h-2 md:w-4 md:h-4 bg-zinc-700 rounded-full border border-zinc-600" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
