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
        {/* Brand color glow */}
        <div className="absolute inset-0 rounded-full bg-[#dd9933]/5 blur-2xl" />
        {/* Metallic edge detail - Stroboscope dots effect */}
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
        
        {/* Inner shadow for depth */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_40px_rgba(0,0,0,0.9)]" />
        
        {/* Grooves */}
        <div className="absolute inset-0 rounded-full border-[12px] border-zinc-800/40" />
        <div className="absolute inset-4 rounded-full border-[1px] border-zinc-700/20" />
        <div className="absolute inset-8 rounded-full border-[1px] border-zinc-700/20" />
        <div className="absolute inset-12 rounded-full border-[1px] border-zinc-700/20" />
        <div className="absolute inset-16 rounded-full border-[1px] border-zinc-700/20" />
        <div className="absolute inset-20 rounded-full border-[1px] border-zinc-700/20" />
        
        {/* Album Art / Center Label */}
        <div className="relative w-1/3 h-1/3 rounded-full bg-zinc-800 overflow-hidden border-4 border-black shadow-inner z-10">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Album Cover"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#dd9933] text-white font-bold text-xl">
              MS
            </div>
          )}
          {/* Center Hole */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-zinc-900 rounded-full border border-zinc-700" />
        </div>
      </motion.div>

      {/* Tonearm / Needle */}
      <div className="absolute -top-10 -right-10 w-48 h-48 pointer-events-none hidden md:block z-20">
        <motion.div
          animate={{ rotate: isPlaying ? 28 : -10 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="relative w-full h-full"
          style={{ transformOrigin: "80% 20%" }}
        >
          {/* Main Arm */}
          <div className="absolute top-[20%] right-[20%] w-32 h-2 bg-zinc-300 rounded-full shadow-lg origin-right" 
               style={{ transform: 'rotate(-45deg)' }}>
            
            {/* Headshell (The part with the needle) */}
            <div className="absolute -left-2 -top-2 w-10 h-6 bg-zinc-800 rounded-sm border border-zinc-600 flex items-center justify-center">
              {/* Stylus / Needle tip - High visibility color */}
              <div className="w-1 h-4 bg-[#dd9933] rounded-full shadow-[0_0_8px_#dd9933]" />
            </div>

            {/* Counterweight */}
            <div className="absolute -right-4 -top-2 w-8 h-6 bg-zinc-700 rounded-md border border-zinc-500" />
          </div>

          {/* Pivot Base */}
          <div className="absolute top-[15%] right-[15%] w-12 h-12 bg-zinc-900 rounded-full border-4 border-zinc-800 shadow-2xl flex items-center justify-center">
            <div className="w-4 h-4 bg-zinc-700 rounded-full border border-zinc-600" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
