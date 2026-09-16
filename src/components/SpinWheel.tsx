import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Zap, Square } from 'lucide-react';
import { Choice } from '../types';
import { useSound } from '../hooks/useSound';
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
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(242,183,5,0.06)' : 'rgba(224,71,44,0.05)';
        ctx.fill();
        ctx.strokeStyle = isDark ? 'rgba(245,239,224,0.4)' : 'rgba(26,23,18,0.35)';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDark ? 'rgba(245,239,224,0.45)' : 'rgba(26,23,18,0.4)';
        ctx.font = 'bold 15px "Space Grotesk", system-ui';
        ctx.fillText('Add choices to', cx, cy - 12);
        ctx.fillText('spin the wheel', cx, cy + 12);
        ctx.restore();
        return;
      }

      ctx.setLineDash([]);
      const segAngle = (2 * Math.PI) / n;

      // Segments — flat carnival fill with bold ink dividers
      for (let i = 0; i < n; i++) {
        const start = -Math.PI / 2 + rotation + i * segAngle;
        const end = start + segAngle;
        const color = choices[i].color;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, start, end);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = isDark ? '#f5efe0' : '#1a1712';
        ctx.lineWidth = 2.5;
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

        ctx.font = `700 ${fs}px "Space Grotesk", system-ui, sans-serif`;
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
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fill();
        }
        ctx.restore();
      }

      // Outer ring border — bold ink ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? '#f5efe0' : '#1a1712';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();

      // Decorative bulb-light dots on the rim
      if (n <= 30) {
        const dotCount = Math.min(n * 2, 40);
        for (let d = 0; d < dotCount; d++) {
          const dotA = (d / dotCount) * Math.PI * 2 + rotation;
          const dotX = cx + Math.cos(dotA) * (outerR + 6);
          const dotY = cy + Math.sin(dotA) * (outerR + 6);
          ctx.save();
          ctx.beginPath();
          ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#f2b705';
          ctx.fill();
          ctx.strokeStyle = isDark ? '#f5efe0' : '#1a1712';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Center hub — flat mustard disc with bold ink border
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = '#f2b705';
      ctx.fill();
      ctx.strokeStyle = isDark ? '#f5efe0' : '#1a1712';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // SPIN label in hub
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const hubFs = Math.max(7, Math.min(12, innerR * 0.45));
      ctx.font = `700 ${hubFs}px "Space Grotesk", system-ui`;
      ctx.fillStyle = '#1a1712';
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
          className="absolute z-20"
          style={{ top: 0, left: '50%', transform: 'translateX(-50%) translateY(-2px)' }}
        >
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
            <path d="M14 36L0 0H28L14 36Z" fill="#e0472c" stroke={isDark ? '#f5efe0' : '#1a1712'} strokeWidth="2" strokeLinejoin="round" />
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
          />
        )}
      </div>

      {/* Spin / Stop buttons — compact so the wheel stays the focal point */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={stopSpin}
          disabled={!isSpinning}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-150 select-none border-2
            ${isSpinning
              ? 'bg-red-600 border-[var(--ink)] text-white hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-transparent border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 cursor-not-allowed'
            }`}
          aria-label="Stop the wheel"
        >
          <Square size={12} fill="currentColor" /> Stop
        </button>

        <button
          onClick={spin}
          disabled={isSpinning || choices.length === 0}
          className={`relative flex items-center gap-1.5 px-6 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-150 select-none border-2
            ${isSpinning || choices.length === 0
              ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 cursor-not-allowed'
              : 'bg-crimson-600 border-[var(--ink)] text-white hover:-translate-y-0.5 active:translate-y-0'
            }`}
          aria-label="Spin the wheel"
        >
          {choices.length === 0 ? 'Add choices first' : (
            <><Zap size={14} /> Spin Now</>
          )}
        </button>
      </div>
    </div>
  );
};

export default SpinWheel;
