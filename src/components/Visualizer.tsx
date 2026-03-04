import React, { useEffect, useRef } from "react";

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  color?: string;
}

export function Visualizer({ analyser, isPlaying, color = "#dd9933" }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        
        // Draw bars from the center outwards or just simple bars
        // Let's do a mirrored effect from the center
        const centerX = canvas.width / 2;
        
        // Right side
        ctx.fillRect(centerX + x, canvas.height - barHeight, barWidth, barHeight);
        // Left side
        ctx.fillRect(centerX - x - barWidth, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
        if (centerX + x > canvas.width) break;
      }
    };

    if (isPlaying) {
      draw();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isPlaying, color]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={100}
      className="w-full h-24 opacity-80"
    />
  );
}
