import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Shuffle, ChevronDown, ChevronUp, Users, Square } from 'lucide-react';
import { useSound } from '../../hooks/useSound';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { generateId } from '../../utils/id';
import { getColorForIndex } from '../../constants/colors';
import PeopleSetup, { Player } from './PeopleSetup';

/* ─── helpers ──────────────────────────────────────────────────────────────── */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawBottle(
  ctx: CanvasRenderingContext2D,
  scale: number,
  glowIntensity: number
) {
  const s = scale;

  const bodyLeft   = -s * 0.92;
  const bodyRight  = -s * 0.05;
  const shoulRight =  s * 0.27;
  const neckRight  =  s * 1.00;
  const bodyHalf   =  s * 0.245;
  const neckHalf   =  s * 0.067;
  const baseR      =  s * 0.245;

  const buildBottlePath = () => {
    ctx.beginPath();
    ctx.arc(bodyLeft + baseR, 0, baseR, Math.PI / 2, -Math.PI / 2, false);
    ctx.lineTo(bodyRight, -bodyHalf);
    ctx.bezierCurveTo(
      bodyRight + (shoulRight - bodyRight) * 0.45, -bodyHalf,
      shoulRight - (shoulRight - bodyRight) * 0.25, -neckHalf * 1.2,
      shoulRight, -neckHalf
    );
    ctx.lineTo(neckRight - neckHalf, -neckHalf);
    ctx.arc(neckRight - neckHalf, 0, neckHalf, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(shoulRight, neckHalf);
    ctx.bezierCurveTo(
      shoulRight - (shoulRight - bodyRight) * 0.25, neckHalf * 1.2,
      bodyRight + (shoulRight - bodyRight) * 0.45, bodyHalf,
      bodyRight, bodyHalf
    );
    ctx.lineTo(bodyLeft + baseR, bodyHalf);
    ctx.closePath();
  };

  const bw = neckRight - bodyLeft + 4;

  // ── Base fill with drop shadow (vertical gradient for top/bottom curvature) ──
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur  = 22;
  buildBottlePath();
  const vertGrad = ctx.createLinearGradient(0, -bodyHalf, 0, bodyHalf);
  vertGrad.addColorStop(0,    '#1a6e1a');
  vertGrad.addColorStop(0.22, '#1e8a1e');
  vertGrad.addColorStop(0.48, '#28a028');
  vertGrad.addColorStop(0.52, '#28a028');
  vertGrad.addColorStop(0.78, '#1e8a1e');
  vertGrad.addColorStop(1,    '#1a6e1a');
  ctx.fillStyle = vertGrad;
  ctx.fill();
  ctx.restore();

  // ── Horizontal depth modulation (rim shadow + cylindrical highlight band) ──
  ctx.save();
  buildBottlePath();
  ctx.clip();
  const horizGrad = ctx.createLinearGradient(bodyLeft, 0, bodyRight + s * 0.35, 0);
  horizGrad.addColorStop(0,    'rgba(0,0,0,0)');       // no darkening at base — keeps green visible
  horizGrad.addColorStop(0.10, 'rgba(0,0,0,0.06)');
  horizGrad.addColorStop(0.22, 'rgba(120,255,120,0.20)');
  horizGrad.addColorStop(0.40, 'rgba(0,0,0,0)');
  horizGrad.addColorStop(0.68, 'rgba(0,0,0,0.14)');
  horizGrad.addColorStop(1.00, 'rgba(0,0,0,0.40)');
  ctx.fillStyle = horizGrad;
  ctx.fillRect(bodyLeft - 2, -bodyHalf - 2, bw, bodyHalf * 2 + 4);
  ctx.restore();

  // ── Outline ──────────────────────────────────────────────────────────────
  ctx.save();
  buildBottlePath();
  ctx.strokeStyle = 'rgba(0,28,0,0.68)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // ── Primary specular highlight ────────────────────────────────────────────
  ctx.save();
  buildBottlePath();
  ctx.clip();
  const hlCx = (bodyLeft + baseR + bodyRight) * 0.45;  // upper-center of body
  const hlCy = -bodyHalf * 0.52;
  const hlGrad = ctx.createRadialGradient(hlCx, hlCy, 0, hlCx, hlCy, s * 0.24);
  hlGrad.addColorStop(0,    'rgba(255,255,255,0.52)');
  hlGrad.addColorStop(0.42, 'rgba(255,255,255,0.18)');
  hlGrad.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = hlGrad;
  ctx.fillRect(bodyLeft - 2, -bodyHalf - 2, bw, bodyHalf * 2 + 4);
  ctx.beginPath();
  ctx.ellipse(hlCx - s * 0.01, hlCy - bodyHalf * 0.06, s * 0.026, bodyHalf * 0.068, -0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.fill();
  ctx.restore();

  // ── Neck highlight ────────────────────────────────────────────────────────
  ctx.save();
  buildBottlePath();
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(shoulRight * 0.65, -neckHalf * 0.52, s * 0.013, neckHalf * 0.46, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.40)';
  ctx.fill();
  ctx.restore();

  // ── Label band ────────────────────────────────────────────────────────────
  ctx.save();
  const bandX = shoulRight + s * 0.03;
  const bandW = s * 0.12;
  ctx.beginPath();
  ctx.roundRect(bandX, -neckHalf * 1.05, bandW, neckHalf * 2.1, neckHalf * 0.35);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 5;
  const bandGrad = ctx.createLinearGradient(0, -neckHalf, 0, neckHalf);
  bandGrad.addColorStop(0,    '#6a0e0e');
  bandGrad.addColorStop(0.30, '#c62828');
  bandGrad.addColorStop(0.50, '#f44336');
  bandGrad.addColorStop(0.70, '#c62828');
  bandGrad.addColorStop(1,    '#6a0e0e');
  ctx.fillStyle = bandGrad;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.roundRect(bandX + bandW * 0.18, -neckHalf * 0.72, bandW * 0.28, neckHalf * 0.60, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.restore();

  // ── Bottle lip ────────────────────────────────────────────────────────────
  ctx.save();
  const lipX = neckRight - neckHalf;
  ctx.beginPath();
  ctx.arc(lipX, 0, neckHalf + 2, -Math.PI * 0.55, Math.PI * 0.55, false);
  ctx.arc(lipX, 0, neckHalf - 2, Math.PI * 0.55, -Math.PI * 0.55, true);
  ctx.closePath();
  const lipGrad = ctx.createLinearGradient(0, -neckHalf, 0, neckHalf);
  lipGrad.addColorStop(0,   '#2a882a');
  lipGrad.addColorStop(0.5, '#4dbb4d');
  lipGrad.addColorStop(1,   '#2a882a');
  ctx.fillStyle = lipGrad;
  ctx.fill();
  ctx.restore();

  // ── Base cap specular highlight (small bright dot, upper area) ───────────
  ctx.save();
  buildBottlePath();
  ctx.clip();
  const basHlX = bodyLeft + baseR * 0.48;
  const basHlY = -bodyHalf * 0.48;
  ctx.beginPath();
  ctx.ellipse(basHlX, basHlY, s * 0.022, bodyHalf * 0.055, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();
  ctx.restore();

  // ── Spinning tip glow ─────────────────────────────────────────────────────
  if (glowIntensity > 0) {
    ctx.save();
    const tipX = neckRight;
    const gR = neckHalf * 4.5 + glowIntensity * s * 0.18;
    const tipGrad = ctx.createRadialGradient(tipX, 0, 0, tipX, 0, gR);
    tipGrad.addColorStop(0,    `rgba(255,235,80,${+(0.92 * glowIntensity).toFixed(2)})`);
    tipGrad.addColorStop(0.35, `rgba(255,160,20,${+(0.55 * glowIntensity).toFixed(2)})`);
    tipGrad.addColorStop(1,    'rgba(255,100,0,0)');
    ctx.beginPath();
    ctx.arc(tipX, 0, gR, 0, Math.PI * 2);
    ctx.fillStyle = tipGrad;
    ctx.fill();
    ctx.restore();
  }
}

/* ─── draw player avatar: circle with large initial only ────────────────────── */

function drawPlayerHead(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  r: number,
  color: string,
  name: string,
  isWinner: boolean
) {
  const [rr, gg, bb] = hexToRgb(color);

  /* ── circle fill with radial gradient ───────────────────────── */
  ctx.save();
  ctx.shadowColor  = 'rgba(0,0,0,0.50)';
  ctx.shadowBlur   = 10;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  const fill = ctx.createRadialGradient(px - r * 0.30, py - r * 0.30, 0, px, py, r);
  fill.addColorStop(0, `rgba(${Math.min(rr+65,255)},${Math.min(gg+65,255)},${Math.min(bb+65,255)},1)`);
  fill.addColorStop(0.6, color);
  fill.addColorStop(1,   `rgba(${Math.max(rr-30,0)},${Math.max(gg-30,0)},${Math.max(bb-30,0)},1)`);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();

  /* ── border ring ─────────────────────────────────────────────── */
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.strokeStyle = isWinner ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.32)';
  ctx.lineWidth   = isWinner ? 2.5 : 1.5;
  ctx.stroke();

  /* ── winner outer pulse ring ────────────────────────────────── */
  if (isWinner) {
    ctx.beginPath();
    ctx.arc(px, py, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rr},${gg},${bb},0.48)`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  /* ── initial + name (two-line inside circle) ────────────────── */
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  if (r >= 18) {
    // Compute name font size to fit within circle width
    const maxW      = r * 1.72;   // usable width ≈ 86% of diameter
    const baseSz    = Math.round(r * 0.26);
    const charW     = baseSz * 0.62;
    const maxChars  = Math.max(4, Math.floor(maxW / charW));
    const shortName = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
    const nameSz    = Math.max(7, Math.min(baseSz, Math.floor(maxW / (shortName.length * 0.62))));

    // Initial (upper)
    ctx.font = `800 ${Math.round(r * 0.44)}px Inter, system-ui, sans-serif`;
    ctx.strokeStyle = 'rgba(0,0,0,0.50)';
    ctx.lineWidth   = 3;
    ctx.lineJoin    = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.70)';
    ctx.shadowBlur  = 4;
    ctx.strokeText(initial, px, py - r * 0.20);
    ctx.fillStyle   = '#ffffff';
    ctx.fillText(initial, px, py - r * 0.20);

    // Name (lower)
    ctx.font = `700 ${nameSz}px Inter, system-ui, sans-serif`;
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 3;
    ctx.strokeText(shortName, px, py + r * 0.42);
    ctx.fillStyle   = 'rgba(255,255,255,0.96)';
    ctx.fillText(shortName, px, py + r * 0.42);
  } else {
    // Very small circle: just initial
    ctx.font = `800 ${Math.round(r * 0.70)}px Inter, system-ui, sans-serif`;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth   = 3;
    ctx.lineJoin    = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.70)';
    ctx.shadowBlur  = 4;
    ctx.strokeText(initial, px, py);
    ctx.fillStyle   = '#ffffff';
    ctx.fillText(initial, px, py);
  }
  ctx.restore();
}

/* ─── canvas draw ───────────────────────────────────────────────────────────── */

function drawScene(
  ctx: CanvasRenderingContext2D,
  size: number,
  players: Player[],
  rotation: number,
  winnerIdx: number,
  isSpinning: boolean,
  isDark: boolean
) {
  const cx = size / 2;
  const cy = size / 2;
  const n = players.length;

  ctx.clearRect(0, 0, size, size);
  if (n === 0) return;

  /* ── table surface ─────────────────────────────────────────────────── */
  const tableR = size * 0.44;
  const tableSurface = ctx.createRadialGradient(cx, cy, 0, cx, cy, tableR);
  if (isDark) {
    tableSurface.addColorStop(0,   'rgba(35,28,72,0.88)');
    tableSurface.addColorStop(0.7, 'rgba(25,20,56,0.93)');
    tableSurface.addColorStop(1,   'rgba(16,13,42,0.82)');
  } else {
    tableSurface.addColorStop(0,   'rgba(230,230,255,0.8)');
    tableSurface.addColorStop(0.7, 'rgba(210,210,245,0.9)');
    tableSurface.addColorStop(1,   'rgba(190,190,230,0.7)');
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, tableR, 0, Math.PI * 2);
  ctx.fillStyle = tableSurface;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  ctx.fill();
  ctx.restore();

  // Table ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, tableR, 0, Math.PI * 2);
  const ringGrad = ctx.createLinearGradient(0, 0, size, size);
  ringGrad.addColorStop(0,   'rgba(124,58,237,0.5)');
  ringGrad.addColorStop(0.5, 'rgba(99,102,241,0.3)');
  ringGrad.addColorStop(1,   'rgba(139,92,246,0.5)');
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  /* ── players ────────────────────────────────────────────────────────── */
  // Circles at 70 % of table radius so they stay well clear of the bottle
  const playerR      = tableR * 0.70;
  const arcPerPlayer = (playerR * Math.PI * 2) / n;
  // Scale with canvas: max = 22% of tableR so circles grow on large screens
  const avatarR      = Math.max(18, Math.min(tableR * 0.22, arcPerPlayer * 0.40));
  const segAngle     = (Math.PI * 2) / n;

  players.forEach((player, i) => {
    const angle    = segAngle * i - Math.PI / 2;
    const px       = cx + playerR * Math.cos(angle);
    const py       = cy + playerR * Math.sin(angle);
    const isWinner = i === winnerIdx;

    // Winner halo
    if (isWinner) {
      ctx.save();
      const [wr, wg, wb] = hexToRgb(player.color);
      const glowPulse = 0.75 + 0.25 * Math.sin(Date.now() * 0.006);
      const halo = ctx.createRadialGradient(px, py, avatarR, px, py, avatarR * 3.2);
      halo.addColorStop(0,   `rgba(${wr},${wg},${wb},${+(0.70 * glowPulse).toFixed(2)})`);
      halo.addColorStop(0.5, `rgba(${wr},${wg},${wb},${+(0.28 * glowPulse).toFixed(2)})`);
      halo.addColorStop(1,   `rgba(${wr},${wg},${wb},0)`);
      ctx.beginPath();
      ctx.arc(px, py, avatarR * 3.2, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();
      ctx.restore();
    }

    // Avatar: circle with initial + name inside
    drawPlayerHead(ctx, px, py, avatarR, player.color, player.name, isWinner);
  });

  /* ── centre pivot ───────────────────────────────────────────────────── */
  ctx.save();
  const pivotR = Math.max(6, size * 0.025);
  const pivotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pivotR);
  pivotGrad.addColorStop(0,   '#ffffff');
  pivotGrad.addColorStop(0.5, '#d0d0d0');
  pivotGrad.addColorStop(1,   '#888888');
  ctx.beginPath();
  ctx.arc(cx, cy, pivotR, 0, Math.PI * 2);
  ctx.fillStyle = pivotGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  /* ── bottle ─────────────────────────────────────────────────────────── */
  const bottleScale = tableR * 0.44;
  const glowIntensity = isSpinning ? 0.5 : winnerIdx >= 0 ? 0.0 : 0.0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  drawBottle(ctx, bottleScale, glowIntensity);
  ctx.restore();
}

/* ─── physics constants ─────────────────────────────────────────────────────── */

// Friction factor applied per millisecond (delta-time independent).
// Equivalent to ×0.985 per frame at 60 fps → stops a hard flick in ~5 s.
const FRICTION_PER_MS = Math.pow(0.985, 1 / 16.667);

// Below this angular speed (rad/ms) the bottle is considered stopped
const STOP_THRESHOLD = 0.00014; // ≈ 0.5°/frame @ 60 fps

// Maximum flick speed the UI accepts (rad/ms).
const MAX_VELOCITY = 0.065; // ≈ 10 rotations/s at peak — feels like a real hard flick

/* ─── main component ────────────────────────────────────────────────────────── */

interface SpinBottleGameProps {
  soundEnabled: boolean;
  isDark: boolean;
}

const SpinBottleGame: React.FC<SpinBottleGameProps> = ({ soundEnabled, isDark }) => {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rotation & animation
  const rotRef        = useRef(0);         // current bottle angle (radians)
  const velRef        = useRef(0);         // angular velocity (rad / ms)
  const animRef       = useRef(0);         // RAF handle
  const rafPulseRef   = useRef(0);         // winner-glow RAF handle
  const isSpinningRef = useRef(false);     // physics active?

  // Pointer drag tracking
  const isDraggingRef        = useRef(false);
  const lastPtrAngleRef      = useRef(0);  // previous angle from centre (rad)
  const lastPtrTimeRef       = useRef(0);  // timestamp of last pointermove
  // Sliding window of recent (deltaAngle, time) samples for velocity estimation
  const velSamplesRef        = useRef<{ dA: number; dt: number }[]>([]);

  const [size, setSize]         = useState(340);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [winnerIdx, setWinnerIdx]   = useState(-1);
  // collapsed by default on mobile, expanded on desktop
  const [playersExpanded, setPlayersExpanded] = useState(() => window.innerWidth >= 1024);

  // Key bumped to v3 so new defaults load fresh for existing users
  const [players, setPlayers] = useLocalStorage<Player[]>('stb-players-v3', [
    { id: generateId(), name: 'Prince',    color: getColorForIndex(0)  },
    { id: generateId(), name: 'Ujjwal',    color: getColorForIndex(1)  },
    { id: generateId(), name: 'Prashant',  color: getColorForIndex(2)  },
    { id: generateId(), name: 'Mona',      color: getColorForIndex(3)  },
    { id: generateId(), name: 'Geeky',     color: getColorForIndex(4)  },
    { id: generateId(), name: 'Radhika',   color: getColorForIndex(5)  },
    { id: generateId(), name: 'Sangeetha', color: getColorForIndex(6)  },
    { id: generateId(), name: 'Orro',      color: getColorForIndex(7)  },
    { id: generateId(), name: 'Vikrant',   color: getColorForIndex(8)  },
    { id: generateId(), name: 'Shraddha',  color: getColorForIndex(9)  },
  ]);

  const { startBottleSpin, stopBottleSpin, playBottleStop } = useSound(soundEnabled);

  /* ── size observer ────────────────────────────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const s = Math.min(r.width, r.height, 520);
      if (s > 40) setSize(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── render ───────────────────────────────────────────────────────────── */
  const render = useCallback(
    (rotation: number, wIdx: number, spinning: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawScene(ctx, size, players, rotation, wIdx, spinning, isDark);
    },
    [players, size, isDark]
  );

  useEffect(() => {
    render(rotRef.current, winnerIdx, isSpinning);
  }, [render, winnerIdx, isSpinning]);

  // Keep the winner glow pulsing
  useEffect(() => {
    if (winnerIdx < 0) return;
    const loop = () => {
      render(rotRef.current, winnerIdx, false);
      rafPulseRef.current = requestAnimationFrame(loop);
    };
    rafPulseRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafPulseRef.current);
  }, [winnerIdx, render]);

  /* ── helper: angle from canvas centre ────────────────────────────────── */
  const angleFromCentre = useCallback((clientX: number, clientY: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const r = canvas.getBoundingClientRect();
    return Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2));
  }, []);

  /* ── helper: determine nearest player given current rotation ──────────── */
  const nearestPlayer = useCallback(
    (rotation: number): number => {
      const n = players.length;
      if (n === 0) return -1;
      const seg = (Math.PI * 2) / n;
      // Bottle neck points RIGHT (0 rad). Player i is at angle seg*i - π/2.
      // So the neck points at player i when rotation ≡ seg*i - π/2.
      // Rearranging: i ≈ (rotation + π/2) / seg  (mod n)
      const norm = ((rotation + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      return Math.round(norm / seg) % n;
    },
    [players.length]
  );

  /* ── snap animation: ease bottle to exact player angle ───────────────── */
  const snapToPlayer = useCallback(
    (idx: number) => {
      const n = players.length;
      if (n === 0) return;
      const seg = (Math.PI * 2) / n;
      const targetRot = seg * idx - Math.PI / 2;

      // Shortest delta to target (keeping accumulated rotations)
      let delta = ((targetRot - rotRef.current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      if (delta > Math.PI) delta -= Math.PI * 2;

      const snapFrom = rotRef.current;
      const duration = 220; // ms
      const startTime = performance.now();

      const step = (now: number) => {
        const p = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out
        rotRef.current = snapFrom + delta * eased;
        render(rotRef.current, idx, false);

        if (p < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          isSpinningRef.current = false;
          setIsSpinning(false);
          setWinnerIdx(idx);
          playBottleStop();
        }
      };
      animRef.current = requestAnimationFrame(step);
    },
    [players.length, render, playBottleStop]
  );

  /* ── physics loop: apply velocity + friction each frame ──────────────── */
  const startPhysics = useCallback(
    (initialVelocity: number) => {
      cancelAnimationFrame(animRef.current);
      cancelAnimationFrame(rafPulseRef.current);

      velRef.current = initialVelocity;
      isSpinningRef.current = true;
      setIsSpinning(true);
      setWinnerIdx(-1);

      // Pre-schedule sound for estimated stop time
      const estimatedSec = Math.log(STOP_THRESHOLD / Math.abs(initialVelocity)) /
        Math.log(FRICTION_PER_MS) / 1000;
      startBottleSpin(Math.max(0.5, estimatedSec), initialVelocity);

      let lastTime: number | null = null;

      const loop = (ts: number) => {
        if (lastTime === null) { lastTime = ts; animRef.current = requestAnimationFrame(loop); return; }
        const dt = Math.min(ts - lastTime, 64); // clamp for tab-switch gaps
        lastTime = ts;

        // Integrate
        rotRef.current += velRef.current * dt;
        // Apply friction
        velRef.current *= Math.pow(FRICTION_PER_MS, dt);

        render(rotRef.current, -1, true);

        if (Math.abs(velRef.current) > STOP_THRESHOLD) {
          animRef.current = requestAnimationFrame(loop);
        } else {
          velRef.current = 0;
          stopBottleSpin();
          const idx = nearestPlayer(rotRef.current);
          snapToPlayer(idx);
        }
      };

      animRef.current = requestAnimationFrame(loop);
    },
    [render, nearestPlayer, snapToPlayer, startBottleSpin, stopBottleSpin]
  );

  /* ── pointer down: begin drag, cancel any ongoing physics ────────────── */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (players.length < 2) return;

      // Interrupt physics so user can grab the bottle mid-spin
      cancelAnimationFrame(animRef.current);
      cancelAnimationFrame(rafPulseRef.current);
      isSpinningRef.current = false;
      setIsSpinning(false);
      velRef.current = 0;

      isDraggingRef.current = true;
      setIsDragging(true);
      lastPtrAngleRef.current = angleFromCentre(e.clientX, e.clientY);
      lastPtrTimeRef.current  = e.timeStamp;
      velSamplesRef.current   = [];

      ;(e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    },
    [players.length, angleFromCentre]
  );

  /* ── pointer move: rotate bottle live with the drag ──────────────────── */
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return;

      const now  = e.timeStamp;
      const angle = angleFromCentre(e.clientX, e.clientY);
      const dt   = now - lastPtrTimeRef.current;

      if (dt > 0) {
        let dA = angle - lastPtrAngleRef.current;
        // Clamp large jumps from wraparound (±π → ±2π edge)
        if (dA >  Math.PI) dA -= Math.PI * 2;
        if (dA < -Math.PI) dA += Math.PI * 2;

        rotRef.current += dA;
        render(rotRef.current, -1, false);

        // Store sample for velocity estimation (keep last 80 ms)
        velSamplesRef.current.push({ dA, dt });
        velSamplesRef.current = velSamplesRef.current.filter(
          (_, i, arr) => arr.slice(i).reduce((s, x) => s + x.dt, 0) <= 80
        );
      }

      lastPtrAngleRef.current = angle;
      lastPtrTimeRef.current  = now;
    },
    [angleFromCentre, render]
  );

  /* ── pointer up: compute flick velocity and release ──────────────────── */
  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      ;(e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);

      const samples = velSamplesRef.current;
      if (samples.length === 0) return;

      // Weighted average: more recent samples get higher weight
      let wSum = 0, vSum = 0;
      samples.forEach(({ dA, dt }, i) => {
        const w = i + 1; // linear ramp: latest sample has highest weight
        vSum += (dA / dt) * w;
        wSum += w;
      });
      const flickVel = vSum / wSum; // rad / ms

      // Ignore micro-touches that weren't real flicks
      if (Math.abs(flickVel) < 0.0008) {
        // Just redraw at rest
        render(rotRef.current, -1, false);
        return;
      }

      const clamped = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, flickVel));
      startPhysics(clamped);
    },
    [startPhysics, render]
  );

  /* ── button: stop the bottle mid-spin ───────────────────────────────── */
  const stopBottle = useCallback(() => {
    if (!isSpinningRef.current) return;
    cancelAnimationFrame(animRef.current);
    velRef.current = 0;
    stopBottleSpin();
    const idx = nearestPlayer(rotRef.current);
    snapToPlayer(idx);
  }, [nearestPlayer, snapToPlayer, stopBottleSpin]);

  /* ── button: simulate a random forceful flick ────────────────────────── */
  const randomFlick = useCallback(() => {
    if (players.length < 2 || isSpinningRef.current) return;
    setWinnerIdx(-1);
    const v = (0.030 + Math.random() * 0.035) * (Math.random() < 0.5 ? 1 : -1);
    startPhysics(v);
  }, [players.length, startPhysics]);

  /* ── keyboard ─────────────────────────────────────────────────────────── */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') randomFlick();
    },
    [randomFlick]
  );

  const winner  = winnerIdx >= 0 ? players[winnerIdx] : null;
  const canFlick = players.length >= 2;

  /* ── cursor style ─────────────────────────────────────────────────────── */
  const cursor = isDragging
    ? 'cursor-grabbing'
    : isSpinning
    ? 'cursor-wait'
    : canFlick
    ? 'cursor-grab'
    : 'cursor-default';

  return (
    <div className="flex flex-col lg:flex-row gap-5 w-full">
      {/* ── Canvas + hint + result (order-1 on mobile so it appears first) ── */}
      <div className="flex-1 flex flex-col items-center gap-4 min-w-0 order-1 lg:order-2">

        {/* Canvas card — hint + canvas + buttons all inside the same card */}
        <div className="glass-card p-4 w-full flex flex-col items-center gap-3">
          <p className="text-xs text-gray-400 dark:text-white/40 select-none">
            Drag &amp; flick the bottle to spin
          </p>

          <div
            ref={containerRef}
            className="relative w-full"
            style={{ maxWidth: 520, aspectRatio: '1 / 1' }}
          >
            <canvas
              ref={canvasRef}
              width={size}
              height={size}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
              tabIndex={0}
              aria-label="Spin the bottle — drag and flick to spin"
              className={`${cursor} transition-[filter] duration-150 rounded-full outline-none select-none`}
              style={{ width: size, height: size, display: 'block', touchAction: 'none' }}
            />
            {isSpinning && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none animate-pulse-glow"
                style={{ boxShadow: '0 0 55px 6px rgba(124,58,237,0.35)' }}
              />
            )}
            {isDragging && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ boxShadow: '0 0 0 3px rgba(124,58,237,0.5)' }}
              />
            )}
          </div>

          {/* Buttons — inside the card, same as Spin Wheel */}
          <div className="flex gap-2">
            <button
              onClick={stopBottle}
              disabled={!isSpinning}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 select-none border
                ${isSpinning
                  ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-500/30 hover:bg-red-500 hover:scale-105 active:scale-95'
                  : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/35 cursor-not-allowed'
                }`}
              aria-label="Stop the bottle"
            >
              <Square size={12} fill="currentColor" /> Stop
            </button>

            <button
              onClick={randomFlick}
              disabled={!canFlick || isSpinning}
              className={`flex items-center gap-1.5 px-6 py-2 rounded-xl font-bold text-sm transition-all duration-200 select-none
                ${!canFlick || isSpinning
                  ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95'
                }`}
              aria-label="Random spin"
            >
              {!canFlick ? 'Need 2+ players' : (
                <><Shuffle size={14} /> Random Spin</>
              )}
            </button>
          </div>
        </div>

        {/* Result banner */}
        <AnimatePresence>
          {winner && !isSpinning && (
            <motion.div
              key={winner.id + String(winnerIdx)}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(15,15,35,0.96), rgba(20,20,50,0.98))',
                border: `1px solid ${winner.color}55`,
                boxShadow: `0 0 30px ${winner.color}33`,
              }}
            >
              <div
                className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, transparent, ${winner.color}, transparent)` }}
              />
              <div className="p-5 flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
                  style={{
                    backgroundColor: winner.color,
                    boxShadow: `0 0 20px ${winner.color}66, 0 0 0 2px ${winner.color}66`,
                  }}
                >
                  {winner.name.slice(0, 2).toUpperCase()}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/40 uppercase tracking-widest">The bottle chose</p>
                  <p
                    className="text-2xl font-black text-white truncate"
                    style={{ textShadow: `0 0 20px ${winner.color}` }}
                  >
                    {winner.name}
                  </p>
                  <p className="text-sm text-white/50">It's your turn!</p>
                </div>
                <button
                  onClick={() => {
                    cancelAnimationFrame(rafPulseRef.current);
                    setWinnerIdx(-1);
                    render(rotRef.current, -1, false);
                  }}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                  aria-label="Dismiss result"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Collapsible players panel (order-2 on mobile, order-1 on desktop) ── */}
      <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 order-2 lg:order-1">
        <div className="glass-card overflow-hidden">
          {/* Toggle header */}
          <button
            onClick={() => setPlayersExpanded((e) => !e)}
            className="w-full flex items-center gap-2 px-4 py-3.5 text-sm font-bold text-gray-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            aria-expanded={playersExpanded}
          >
            <Users size={15} className="text-purple-500 dark:text-purple-400 flex-shrink-0" />
            <span>Players</span>
            <span className="text-xs font-normal text-gray-400 dark:text-white/35">
              ({players.length})
            </span>
            <span className="ml-auto text-gray-400 dark:text-white/40">
              {playersExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          </button>

          {/* Collapsible content */}
          <AnimatePresence initial={false}>
            {playersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div
                  className="p-4 pt-2 flex flex-col overflow-hidden"
                  style={{ height: 'clamp(300px, 52vh, 680px)' }}
                >
                  <PeopleSetup players={players} onChange={(p) => { setWinnerIdx(-1); setPlayers(p); }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>
    </div>
  );
};

export default SpinBottleGame;
