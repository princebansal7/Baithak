import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { Choice } from '../types';
import { useSound } from '../hooks/useSound';
import { lightenHex } from '../constants/colors';
import { getSegmentAtRotation, isNearBoundary, easeOutQuint } from '../utils/wheelMath';

interface SpinWheelProps {
  choices: Choice[];
  onSpinComplete: (winner: Choice, edgeCase: { near: boolean; adjacentIndex: number }) => void;
  soundEnabled: boolean;
  isDark: boolean;
}

const SpinWheel: React.FC<SpinWheelProps> = ({ choices, onSpinComplete, soundEnabled, isDark }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const isSpinningRef = useRef(false);
  const lastSegRef = useRef(-1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [size, setSize] = useState(280);
  const { playTick, playWin } = useSound(soundEnabled);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const s = Math.min(rect.width, 580);
      if (s > 40) setSize(s);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const drawWheel = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const n = choices.length;
      const cx = size / 2;
      const cy = size / 2;
      const outerR = cx - 8;
      const innerR = Math.max(28, outerR * 0.13);

      ctx.clearRect(0, 0, size, size);

      if (n === 0) {
        // Empty state
        ctx.save();
        ctx.shadowColor = 'rgba(124,58,237,0.3)';
        ctx.shadowBlur = 30;
        const emptyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
        emptyGrad.addColorStop(0, isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.05)');
        emptyGrad.addColorStop(1, isDark ? 'rgba(79,46,220,0.05)' : 'rgba(79,46,220,0.02)');
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.fillStyle = emptyGrad;
        ctx.fill();
        ctx.strokeStyle = isDark ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.3)';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
        ctx.font = 'bold 15px Inter, system-ui';
        ctx.fillText('Add choices to', cx, cy - 12);
        ctx.fillText('spin the wheel ✨', cx, cy + 12);
        ctx.restore();
        return;
      }

      ctx.setLineDash([]);
      const segAngle = (2 * Math.PI) / n;

      // Outer glow
      ctx.save();
      ctx.shadowColor = 'rgba(124,58,237,0.5)';
      ctx.shadowBlur = 35;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = 'transparent';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Segments
      for (let i = 0; i < n; i++) {
        const start = -Math.PI / 2 + rotation + i * segAngle;
        const end = start + segAngle;
        const color = choices[i].color;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, start, end);
        ctx.closePath();

        const midA = start + segAngle / 2;
        const gx = cx + Math.cos(midA) * outerR * 0.7;
        const gy = cy + Math.sin(midA) * outerR * 0.7;
        const grad = ctx.createLinearGradient(cx, cy, gx, gy);
        grad.addColorStop(0, lightenHex(color, 28));
        grad.addColorStop(0.6, color);
        grad.addColorStop(1, lightenHex(color, -15));
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // Text
        const textA = start + segAngle / 2;
        const textR = outerR * (n > 16 ? 0.55 : 0.62);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(textA);

        const maxCh = n > 20 ? 7 : n > 14 ? 10 : n > 8 ? 14 : 20;
        const raw = choices[i].label;
        const label = raw.length > maxCh ? raw.slice(0, maxCh - 1) + '…' : raw;
        const fs = Math.max(9, Math.min(15, (outerR * 0.78) / Math.max(n, 4)));

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${fs}px Inter, system-ui`;
        // Draw dark outline pass for maximum legibility on any color
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(label, textR, 0);
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, textR, 0);
        ctx.shadowBlur = 0;

        // Small dot marker near edge
        if (n <= 20) {
          ctx.beginPath();
          ctx.arc(textR + 10, 0, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.shadowBlur = 0;
          ctx.fill();
        }
        ctx.restore();
      }

      // Outer ring border
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      const ringGrad = ctx.createLinearGradient(0, 0, size, size);
      ringGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
      ringGrad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
      ringGrad.addColorStop(1, 'rgba(255,255,255,0.7)');
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();

      // Decorative outer dots
      if (n <= 30) {
        const dotCount = Math.min(n * 2, 40);
        for (let d = 0; d < dotCount; d++) {
          const dotA = (d / dotCount) * Math.PI * 2 + rotation;
          const dotX = cx + Math.cos(dotA) * (outerR + 3);
          const dotY = cy + Math.sin(dotA) * (outerR + 3);
          ctx.save();
          ctx.beginPath();
          ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fill();
          ctx.restore();
        }
      }

      // Center hub
      ctx.save();
      const hubGrad = ctx.createRadialGradient(cx - innerR * 0.3, cy - innerR * 0.3, 0, cx, cy, innerR);
      hubGrad.addColorStop(0, '#ffffff');
      hubGrad.addColorStop(0.6, '#f0f0f0');
      hubGrad.addColorStop(1, '#d0d0d0');
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = hubGrad;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // SPIN label in hub
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const hubFs = Math.max(7, Math.min(12, innerR * 0.45));
      ctx.font = `800 ${hubFs}px Inter, system-ui`;
      ctx.fillStyle = '#555';
      ctx.fillText('SPIN', cx, cy);
      ctx.restore();
    },
    [choices, size, isDark]
  );

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [drawWheel]);

  const spin = useCallback(() => {
    if (isSpinningRef.current || choices.length === 0) return;
    isSpinningRef.current = true;
    setIsSpinning(true);

    const minRot = 5 + Math.floor(Math.random() * 6); // 5–10 full rotations
    const randomExtra = Math.random() * Math.PI * 2;
    const totalSpin = minRot * Math.PI * 2 + randomExtra;
    const startAngle = rotationRef.current;
    const duration = 5500 + Math.random() * 2500; // 5.5–8s
    let startTime: number | null = null;
    lastSegRef.current = getSegmentAtRotation(startAngle, choices.length);

    const animate = (ts: number) => {
      if (startTime === null) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuint(progress);

      const cur = startAngle + totalSpin * eased;
      rotationRef.current = cur;
      drawWheel(cur);

      const seg = getSegmentAtRotation(cur, choices.length);
      if (seg !== lastSegRef.current) {
        lastSegRef.current = seg;
        playTick();
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        isSpinningRef.current = false;
        setIsSpinning(false);
        const winnerIdx = getSegmentAtRotation(cur, choices.length);
        const edge = isNearBoundary(cur, choices.length);
        playWin();
        onSpinComplete(choices[winnerIdx], edge);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [choices, drawWheel, onSpinComplete, playTick, playWin]);

  // Touch gesture: flick to spin
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchRef.current || isSpinningRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchRef.current.x;
      const dy = touch.clientY - touchRef.current.y;
      const dt = Math.max(Date.now() - touchRef.current.t, 1);
      const dist = Math.hypot(dx, dy);
      const vel = dist / dt;
      touchRef.current = null;
      if (vel > 0.25 && dist > 40) spin();
    },
    [spin]
  );

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Wheel area — width drives height via the canvas size */}
      <div
        ref={containerRef}
        className="relative w-full flex items-center justify-center"
        style={{ maxWidth: 580 }}
      >
        {/* Pointer arrow */}
        <div
          className="absolute z-20 drop-shadow-lg"
          style={{ top: 0, left: '50%', transform: 'translateX(-50%) translateY(-2px)' }}
        >
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
            <defs>
              <linearGradient id="ptrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
              <filter id="ptrShadow">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.4" />
              </filter>
            </defs>
            <path d="M14 36L0 0H28L14 36Z" fill="url(#ptrGrad)" filter="url(#ptrShadow)" />
            <path d="M14 36L4 6H24L14 36Z" fill="#ef4444" opacity="0.6" />
          </svg>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onClick={spin}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          aria-label="Spin wheel — click or tap to spin"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? spin() : undefined}
          className={`${choices.length > 0 && !isSpinning ? 'cursor-pointer hover:brightness-105' : isSpinning ? 'cursor-wait' : 'cursor-default'} transition-[filter] duration-150 rounded-full`}
          style={{ width: size, height: size, display: 'block' }}
        />

        {/* Spinning glow ring */}
        {isSpinning && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none animate-pulse-glow"
            style={{
              background: 'transparent',
              boxShadow: '0 0 60px 10px rgba(124,58,237,0.4)',
            }}
          />
        )}
      </div>

      {/* Spin button */}
      <button
        onClick={spin}
        disabled={isSpinning || choices.length === 0}
        className={`relative px-12 py-4 rounded-2xl font-black text-xl tracking-wide transition-all duration-200 select-none
          ${
            isSpinning || choices.length === 0
              ? 'bg-gray-400 dark:bg-gray-700 text-gray-200 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/40 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/60 active:scale-95'
          }`}
        aria-label="Spin the wheel"
      >
        <span className="relative z-10 flex items-center gap-2">
          {isSpinning ? (
            <span className="flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" /> Spinning…
            </span>
          ) : choices.length === 0 ? (
            'Add choices first'
          ) : (
            <span className="flex items-center gap-2">
              <Zap size={18} /> SPIN NOW
            </span>
          )}
        </span>
        {!isSpinning && choices.length > 0 && (
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 opacity-0 hover:opacity-20 transition-opacity duration-200" />
        )}
      </button>
    </div>
  );
};

export default SpinWheel;
