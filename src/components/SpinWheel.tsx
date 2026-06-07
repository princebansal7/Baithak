import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Zap, Square } from 'lucide-react';
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

      // Retina / high-DPI: render at device resolution so text is sharp
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);

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

        // Text — first character sits at the outer rim, reading inward toward
        // the centre (truncating with "…" at the centre end).
        const textA = start + segAngle / 2;
        const textR = outerR - 14;
        ctx.save();
        ctx.translate(cx, cy);
        // Rotate an extra 180° so +x points from the rim toward the centre.
        // This is a pure rotation (never a reflection), so glyphs are never
        // mirrored — and it keeps the left half of the wheel upright.
        ctx.rotate(textA + Math.PI);

        // Font size adapts to actual arc width at the text radius
        const arcWidthAtText = segAngle * textR;
        const fs = Math.max(11, Math.min(17, arcWidthAtText * 0.4));

        ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Measure-based truncation: trim until text fits the radial space,
        // appending "…" at the centre-facing end.
        const availLen = textR - innerR - 6;
        const raw = choices[i].label;
        let label = raw;
        if (ctx.measureText(label).width > availLen) {
          while (label.length > 1 && ctx.measureText(label + '…').width > availLen) {
            label = label.slice(0, -1);
          }
          label += '…';
        }

        // Strong dark outline + white fill — readable on any segment color.
        // First glyph anchored at the rim (x = -textR), reading toward centre.
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.strokeText(label, -textR, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, -textR, 0);

        // Dot just outside the first character, near the rim
        if (n <= 20) {
          ctx.beginPath();
          ctx.arc(-(textR + 8), 0, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
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

  // Returns distance from canvas centre in CSS pixels
  const distFromCenter = useCallback((clientX: number, clientY: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return Infinity;
    return Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2));
  }, []);

  const centerR = useCallback(() => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return 28;
    const outerR = r.width / 2 - 8;
    return Math.max(28, outerR * 0.13);
  }, []);

  const [hoverCenter, setHoverCenter] = useState(false);

  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (distFromCenter(e.clientX, e.clientY) <= centerR()) spin();
  }, [distFromCenter, centerR, spin]);

  const onCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setHoverCenter(!isSpinning && choices.length > 0 && distFromCenter(e.clientX, e.clientY) <= centerR());
  }, [isSpinning, choices.length, distFromCenter, centerR]);

  const onCanvasTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.changedTouches[0];
    if (distFromCenter(t.clientX, t.clientY) <= centerR()) spin();
  }, [distFromCenter, centerR, spin]);

  const stopSpin = useCallback(() => {
    if (!isSpinningRef.current) return;
    cancelAnimationFrame(animFrameRef.current);
    isSpinningRef.current = false;
    setIsSpinning(false);
    const winnerIdx = getSegmentAtRotation(rotationRef.current, choices.length);
    const edge = isNearBoundary(rotationRef.current, choices.length);
    playWin();
    onSpinComplete(choices[winnerIdx], edge);
  }, [choices, onSpinComplete, playWin]);

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

        {/* Canvas — click/tap the centre hub to spin */}
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onClick={onCanvasClick}
          onMouseMove={onCanvasMouseMove}
          onMouseLeave={() => setHoverCenter(false)}
          onTouchEnd={onCanvasTouchEnd}
          aria-label="Spin wheel — tap the centre circle to spin"
          className={`${isSpinning ? 'cursor-wait' : hoverCenter ? 'cursor-pointer' : 'cursor-default'} transition-[filter] duration-150 rounded-full`}
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

      {/* Spin / Stop buttons — compact so the wheel stays the focal point */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={stopSpin}
          disabled={!isSpinning}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 select-none border
            ${isSpinning
              ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-500/30 hover:bg-red-500 hover:scale-105 active:scale-95'
              : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/35 cursor-not-allowed'
            }`}
          aria-label="Stop the wheel"
        >
          <Square size={12} fill="currentColor" /> Stop
        </button>

        <button
          onClick={spin}
          disabled={isSpinning || choices.length === 0}
          className={`relative flex items-center gap-1.5 px-6 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 select-none
            ${isSpinning || choices.length === 0
              ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 cursor-not-allowed'
              : 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95'
            }`}
          aria-label="Spin the wheel"
        >
          {choices.length === 0 ? 'Add choices first' : (
            <><Zap size={14} /> Spin Now</>
          )}
          {!isSpinning && choices.length > 0 && (
            <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200" />
          )}
        </button>
      </div>
    </div>
  );
};

export default SpinWheel;
