/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface PulseOscilloscopeProps {
  intensity?: number;
  label?: string;
  className?: string;
}

export const PulseOscilloscope: React.FC<PulseOscilloscopeProps> = ({
  intensity = 1,
  label = 'Ledger Heartbeat: Synchronized',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const render = () => {
      t += 0.04;
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Draw faint baseline grid
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.12)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Main pulse waveform
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2DD4BF';

      for (let x = 0; x < width; x++) {
        // Create an organic pulse spike in the middle section
        const normX = x / width;
        let spike = 0;
        
        // Spike wave around 45% - 55% of width
        if (normX > 0.42 && normX < 0.58) {
          const localX = (normX - 0.42) / 0.16; // 0 to 1
          spike = Math.sin(localX * Math.PI * 2) * Math.sin(t * 3) * 18 * intensity;
        }

        const gentleSwell = Math.sin(normX * 12 + t) * 4 * intensity;
        const y = midY + spike + gentleSwell;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Glow beam point traveling along the line
      const travelerX = ((t * 40) % width);
      const travelerNormX = travelerX / width;
      let travelerSpike = 0;
      if (travelerNormX > 0.42 && travelerNormX < 0.58) {
        const localX = (travelerNormX - 0.42) / 0.16;
        travelerSpike = Math.sin(localX * Math.PI * 2) * Math.sin(t * 3) * 18 * intensity;
      }
      const travelerY = midY + travelerSpike + Math.sin(travelerNormX * 12 + t) * 4 * intensity;

      ctx.beginPath();
      ctx.arc(travelerX, travelerY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#5EEAD4';
      ctx.shadowColor = '#2DD4BF';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity]);

  return (
    <div className={`flex items-center gap-3 bg-[#0A161A]/80 dark:bg-[#071013]/90 border border-[#183438] rounded-xl px-3.5 py-2 backdrop-blur-md shadow-xs ${className}`}>
      <div className="relative w-36 h-8 shrink-0 overflow-hidden rounded-md">
        <canvas
          ref={canvasRef}
          width={144}
          height={32}
          className="w-full h-full block"
        />
      </div>

      <div className="flex flex-col text-left leading-none">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400">
          Pulse Rhythm
        </span>
        <span className="text-[11px] text-teal-100/90 font-medium mt-0.5 truncate max-w-[140px]">
          {label}
        </span>
      </div>
    </div>
  );
};
