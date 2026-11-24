import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Shuffle, Play, Pause, Flower2, Sun, Droplet, Layers, Send } from 'lucide-react';
import { useFireworkSound } from './useFireworkSound';

// ─── Types ───────────────────────────────────────────────────────────────────

// Named after classic Japanese hanabi shell types.
type Shape = 'random' | 'kiku' | 'botan' | 'double' | 'willow';
type BurstShape = Exclude<Shape, 'random'>;

interface Rocket {
  x: number; y: number;        // current position
  tx: number; ty: number;      // explosion point
  vx: number; vy: number;      // velocity per frame
  hue: number;
  shape: BurstShape | 'text';
  text?: string;               // for 'text' shells: the words to spell in the sky
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; decay: number;
  h0: number; h1: number;      // hue at birth → hue at death (colour-changing shells)
  sat: number;
  size: number;
  trail: number;               // streak length, in frames of travel
  gravity: number;
  friction: number;
  fade: number;                // alpha = min(1, life * fade); higher holds full brightness longer
  sparkle: boolean;            // flickers out at the end
  crackle: boolean;            // bursts into tiny glitter when it dies
  noGlow: boolean;             // skip the soft halo
  droop: number;               // extra gravity once the star is past 60% of its life (golden rain)
  twinkle: boolean;            // per-frame brightness flicker, like burning glitter
}

interface Flash { x: number; y: number; life: number; hue: number; rad: number }
interface Scheduled { t: number; fn: () => void }  // t = frames until fn runs

const SHAPES: { id: Shape; label: string; icon: React.ReactNode }[] = [
  { id: 'random', label: 'Mix',    icon: <Shuffle size={13} />  },
  { id: 'kiku',   label: 'Kiku',   icon: <Flower2 size={13} />  },
  { id: 'botan',  label: 'Botan',  icon: <Sun size={13} />      },
  { id: 'double', label: 'Double', icon: <Layers size={13} />   },
  { id: 'willow', label: 'Willow', icon: <Droplet size={13} />  },
];

const BURST_SHAPES: BurstShape[] = ['kiku', 'botan', 'double', 'willow'];
// Classic shell colours: red, orange, gold, green, teal, blue, violet, pink — and -1 = silver-white.
const PALETTE = [2, 24, 44, 125, 170, 210, 270, 330, -1];
const MAX_PARTICLES = 5000;
const WATERLINE = 0.82; // fraction of height where the river starts (matches the water layer below)
const LAND_H = 'min(max(20vw, 150px), 42dvh)'; // height of the shore strip; shore and reflection share it so they match
const VOLLEY = 6;       // big shells fired before a name appears

// ─── Text geometry ───────────────────────────────────────────────────────────

// Lays `text` out to fill a boxW × boxH area of the screen and returns star positions in screen
// pixels relative to the box centre. Long text wraps onto several lines; the split that gives the
// biggest letters for this box is chosen, so a name or a whole sentence stays readable on any screen.
const TEXT_FONT = '800 120px "Hiragino Sans","Noto Sans JP","Yu Gothic",system-ui,sans-serif';
const LINE_H = 150;

function textPoints(text: string, boxW: number, boxH: number, maxLineH: number): { pts: [number, number][]; scale: number } {
  const g = document.createElement('canvas').getContext('2d');
  if (!g) return { pts: [], scale: 1 };
  g.font = TEXT_FONT;
  const spaced = /\s/.test(text.trim());
  const units = spaced ? text.trim().split(/\s+/) : Array.from(text.trim());
  const join = spaced ? ' ' : '';
  const width = (i: number, j: number) => g.measureText(units.slice(i, j).join(join)).width;
  const N = units.length;
  if (!N) return { pts: [], scale: 1 };

  // For every line count, find the split with the narrowest widest line (small DP), then keep the
  // line count whose block fits the box at the largest scale.
  let best: { cuts: number[]; scale: number; maxW: number } | null = null;
  for (let n = 1; n <= Math.min(N, 6); n++) {
    const cost: number[][] = Array.from({ length: n + 1 }, () => new Array(N + 1).fill(Infinity));
    const from: number[][] = Array.from({ length: n + 1 }, () => new Array(N + 1).fill(0));
    cost[0][0] = 0;
    for (let k = 1; k <= n; k++) {
      for (let i = k; i <= N; i++) {
        for (let j = k - 1; j < i; j++) {
          const c = Math.max(cost[k - 1][j], width(j, i));
          if (c < cost[k][i]) { cost[k][i] = c; from[k][i] = j; }
        }
      }
    }
    const maxW = cost[n][N];
    const scale = Math.min(boxW / maxW, boxH / (n * LINE_H), maxLineH / LINE_H);
    if (!best || scale > best.scale * 1.04) {
      const cuts: number[] = [];
      for (let k = n, i = N; k > 0; k--) { cuts.unshift(i); i = from[k][i]; }
      best = { cuts, scale, maxW };
    }
  }
  if (!best) return { pts: [], scale: 1 };

  const lines: string[] = [];
  let prev = 0;
  for (const c of best.cuts) { lines.push(units.slice(prev, c).join(join)); prev = c; }

  const W = Math.ceil(best.maxW) + 24;
  const H = lines.length * LINE_H + 24;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c2 = cv.getContext('2d')!;
  c2.font = TEXT_FONT;
  c2.textAlign = 'center';
  c2.textBaseline = 'middle';
  c2.fillStyle = '#fff';
  lines.forEach((l, i) => c2.fillText(l, W / 2, 12 + LINE_H * (i + 0.5)));
  const data = c2.getImageData(0, 0, W, H).data;
  const on = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] > 128;

  // Scatter stars at random across the letters, weighted toward the edges, so strokes read as
  // glowing, uneven bursts of fire rather than a regular dot grid.
  const edge: number[] = [];
  const fill: number[] = [];
  const R2 = 3;
  for (let y = R2; y < H - R2; y++) {
    for (let x = R2; x < W - R2; x++) {
      if (!on(x, y)) continue;
      const rim = !on(x - R2, y) || !on(x + R2, y) || !on(x, y - R2) || !on(x, y + R2);
      (rim ? edge : fill).push(x, y);
    }
  }
  const pts: [number, number][] = [];
  const want = Math.min(3000, Math.round((edge.length + fill.length) / 2 / 5));
  const k = best.scale;
  const take = (list: number[], n: number) => {
    const cnt = list.length / 2;
    // Walk the pixel list at an even stride (with jitter) so stars cover every stroke without gaps.
    for (let i = 0; i < n && cnt > 0; i++) {
      const j = Math.min(cnt - 1, Math.floor(((i + Math.random()) * cnt) / n)) * 2;
      pts.push([(list[j] - W / 2 + Math.random() - 0.5) * k, (list[j + 1] - H / 2 + Math.random() - 0.5) * k]);
    }
  };
  take(edge, Math.round(want * 0.72));
  take(fill, Math.round(want * 0.28));
  return { pts, scale: k };
}

// ─── Scenery ─────────────────────────────────────────────────────────────────

// Cheap deterministic pseudo-random so the scenery is identical on every render.
const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

// Shore silhouette whose bottom edge sits on the waterline. The world is 2000 units wide
// (x from -400 to 1600) so objects stay small relative to the sky. Drawn once for the shore
// and once flipped as the river reflection.
const PAGODA_X = 1280;

const Landscape: React.FC = () => (
  <svg viewBox="-400 0 2000 400" preserveAspectRatio="xMidYMax slice" className="w-full h-full" aria-hidden>
    <defs>
      <linearGradient id="fuji" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7a6cb8" />
        <stop offset="0.55" stopColor="#40377a" />
        <stop offset="1" stopColor="#1d1a45" />
      </linearGradient>
      <linearGradient id="ridge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4a3f80" />
        <stop offset="1" stopColor="#201b4a" />
      </linearGradient>
      <linearGradient id="pagoda" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#14102e" />
        <stop offset="1" stopColor="#05041a" />
      </linearGradient>
      <radialGradient id="windowGlow">
        <stop offset="0" stopColor="#ffb85c" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ffb85c" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="lanternGlow">
        <stop offset="0" stopColor="#ff7a3c" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ff7a3c" stopOpacity="0" />
      </radialGradient>
      <filter id="mist" x="-30%" y="-150%" width="160%" height="400%"><feGaussianBlur stdDeviation="14" /></filter>
    </defs>

    {/* Far hazy ridge */}
    <path d="M-400 400 L-400 280 L0 292 C120 262 220 286 330 256 C440 228 520 266 640 252 C780 238 880 276 1000 260 C1100 250 1160 264 1200 256 L1600 270 L1600 400 Z" fill="url(#ridge)" opacity="0.6" />

    {/* Mt. Fuji with moonlit left flank */}
    <path d="M-400 400 L-400 340 L0 336 C110 326 170 304 238 272 C296 246 334 168 372 122 L388 122 C428 168 468 246 528 272 C614 308 700 322 800 324 C910 326 1010 306 1200 312 L1600 318 L1600 400 Z" fill="url(#fuji)" />
    <path d="M388 122 C428 168 468 246 528 272 C614 308 700 322 800 324 C910 326 1010 306 1200 312 L1600 318 L1600 400 L420 400 C430 300 410 190 388 122 Z" fill="#0a0828" opacity="0.38" />
    <path d="M372 122 L388 122 C402 136 414 154 428 178 L410 166 L396 190 L382 166 L362 192 L346 166 L330 178 C344 154 358 136 372 122 Z" fill="#e9e3ff" opacity="0.7" />

    {/* Drifting mist */}
    <ellipse cx="300" cy="330" rx="700" ry="24" fill="#cfc6ff" opacity="0.13" filter="url(#mist)" />
    <ellipse cx="1150" cy="338" rx="560" ry="20" fill="#cfc6ff" opacity="0.11" filter="url(#mist)" />

    {/* Mid hills */}
    <path d="M-400 400 L-400 364 L0 360 C150 340 260 372 420 358 C600 344 700 380 900 360 C1050 348 1130 366 1200 350 L1600 358 L1600 400 Z" fill="#0d0b27" />

    {/* Distant village lights */}
    <g fill="#ffc861" opacity="0.7">
      {Array.from({ length: 22 }, (_, i) => (
        <circle key={i} cx={i < 11 ? -380 + i * 34 + rnd(i) * 14 : 1330 + (i - 11) * 24 + rnd(i) * 10} cy={362 + rnd(i + 30) * 8} r="1.5" />
      ))}
    </g>

    {/* Arched wooden bridge over a stream: deck, parallel rail and aligned posts */}
    <path d="M560 378 Q650 298 740 378 Z" fill="#3a3274" opacity="0.5" />
    <g stroke="#0a0820" strokeLinecap="round" fill="none">
      <path d="M560 378 Q650 298 740 378" strokeWidth="6" />
      <path d="M560 358 Q650 278 740 358" strokeWidth="3" />
      {Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        const x = 560 + 180 * t;
        const y = 378 - 160 * t * (1 - t);
        return <line key={i} x1={x} y1={y} x2={x} y2={y - 20} strokeWidth="3" />;
      })}
    </g>
    {/* Paper lanterns hung from the bridge posts */}
    {[0, 2, 4, 6, 8].map((i) => {
      const t = i / 8;
      const x = 560 + 180 * t;
      const y = 378 - 160 * t * (1 - t) - 20;
      return (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle cy="9" r="14" fill="url(#lanternGlow)" />
          <line y1="0" y2="3" stroke="#0a0820" strokeWidth="1.2" />
          <ellipse cy="9" rx="4.6" ry="6" fill="#ff6a3c" />
          <ellipse cy="8" rx="2.6" ry="3.6" fill="#ffc27a" opacity="0.85" />
          <rect x="-2.6" y="2.6" width="5.2" height="1.4" fill="#0a0820" />
          <rect x="-2.6" y="14" width="5.2" height="1.4" fill="#0a0820" />
        </g>
      );
    })}
    <g fill="#0a0820">
      <circle cx="560" cy="354" r="4.5" />
      <circle cx="740" cy="354" r="4.5" />
      <rect x="554" y="376" width="12" height="16" />
      <rect x="734" y="376" width="12" height="16" />
    </g>

    {/* Festival nobori flags on poles, either side of the bridge */}
    {[{ x: 522, c: '#a62a1c' }, { x: 778, c: '#2a3f8f' }].map(({ x, c }) => (
      <g key={x}>
        <rect x={x - 1} y="314" width="2" height="68" fill="#0a0820" />
        <rect x={x - 1} y="314" width="15" height="2" fill="#0a0820" />
        <path d={`M${x + 2} 316 h10 v42 l-5 -4 l-5 4 Z`} fill={c} />
        <rect x={x + 5} y="322" width="4" height="3" fill="#f3e9d2" opacity="0.85" />
        <rect x={x + 5} y="330" width="4" height="3" fill="#f3e9d2" opacity="0.85" />
        <rect x={x + 5} y="338" width="4" height="3" fill="#f3e9d2" opacity="0.85" />
      </g>
    ))}

    {/* Village houses */}
    <g fill="#060516">
      {[-330, -260, -190, -120, 1030, 1100, 1170, 1420, 1490, 1550].map((x, i) => {
        const w = 44 + (i % 3) * 8;
        const h = 24 + (i % 2) * 8;
        return (
          <g key={x}>
            <rect x={x} y={378 - h} width={w} height={h} />
            <polygon points={`${x - 6},${378 - h} ${x + w / 2},${378 - h - 16} ${x + w + 6},${378 - h}`} />
            {i % 3 !== 1 && <rect x={x + w / 2 - 4} y={378 - h + 6} width="8" height="9" fill="#ffc861" opacity="0.85" />}
          </g>
        );
      })}
    </g>

    {/* Pine trees */}
    <g fill="#060516">
      {Array.from({ length: 40 }, (_, i) => {
        const x = -390 + i * 50 + (i % 3) * 9;
        if ((x > 530 && x < 770) || (x > 1000 && x < 1210) || (x > 1240 && x < 1330) || (x > 1400 && x < 1600) || (x > -350 && x < -90) || (x > 175 && x < 325)) return null;
        const h = 36 + ((i * 37) % 26);
        return (
          <g key={i}>
            <polygon points={`${x},${376 - h} ${x - 12},${376 - h * 0.4} ${x + 12},${376 - h * 0.4}`} />
            <polygon points={`${x},${376 - h * 0.72} ${x - 16},${376} ${x + 16},${376}`} />
          </g>
        );
      })}
    </g>

    {/* Vermilion torii on the shore: tapered pillars, tie beam, shimagi and upswept kasagi roof */}
    <g transform="translate(250 388)">
      <path d="M-47 0 L-35 0 L-37 -100 L-45 -100 Z" fill="#a62a1c" />
      <path d="M35 0 L47 0 L45 -100 L37 -100 Z" fill="#a62a1c" />
      <rect x="-50" y="-4" width="18" height="6" rx="1.5" fill="#1a0a10" />
      <rect x="32" y="-4" width="18" height="6" rx="1.5" fill="#1a0a10" />
      <rect x="-52" y="-74" width="104" height="7" fill="#8c2216" />
      <rect x="-4" y="-96" width="8" height="22" fill="#6e1a12" />
      <rect x="-62" y="-101" width="124" height="7" fill="#a62a1c" />
      <path d="M-80 -123 Q0 -105 80 -123 L66 -101 L-66 -101 Z" fill="#1b080c" />
    </g>

    {/* Five-storey pagoda with glowing windows */}
    <ellipse cx={PAGODA_X} cy="300" rx="90" ry="120" fill="url(#windowGlow)" opacity="0.5" />
    <g fill="url(#pagoda)">
      <rect x={PAGODA_X - 1.5} y="150" width="3" height="46" fill="#05041a" />
      {[0, 1, 2, 3, 4].map((i) => {
        const w = 100 - i * 15;
        return (
          <g key={i} transform={`translate(${PAGODA_X} ${374 - i * 36})`}>
            <rect x={-w / 2 + 9} y={-24} width={w - 18} height={24} />
            <path d={`M ${-w / 2 - 17} -19 Q ${-w / 2 + 6} -22 ${-w / 2 + 17} -35 L ${w / 2 - 17} -35 Q ${w / 2 - 6} -22 ${w / 2 + 17} -19 Z`} />
            <rect x={-12} y={-18} width={6} height={9} fill="#ffc861" opacity="0.8" />
            <rect x={6} y={-18} width={6} height={9} fill="#ffc861" opacity="0.8" />
          </g>
        );
      })}
    </g>

    {/* Foreground shore */}
    <path d="M-400 400 L-400 380 L0 380 C200 368 420 388 620 380 C820 372 1000 390 1200 378 L1600 380 L1600 400 Z" fill="#04030f" />
  </svg>
);

// Drooping cherry-blossom branch for the top-right corner.
const SakuraBranch: React.FC = () => {
  const pt = (t: number): [number, number] => [
    (1 - t) ** 2 * 400 + 2 * t * (1 - t) * 250 + t * t * 40,
    (1 - t) ** 2 * 10 + 2 * t * (1 - t) * 40 + t * t * 170,
  ];
  const twigs = [0.18, 0.34, 0.5, 0.66, 0.82].map((t, i) => {
    const [x, y] = pt(t);
    return { x, y, ex: x - 18 - rnd(i + 2) * 22, ey: y + 38 + rnd(i + 9) * 28 };
  });
  const blossoms = Array.from({ length: 54 }, (_, i) => {
    const [x, y] = pt(0.05 + 0.92 * rnd(i + 1));
    return {
      x: x + (rnd(i + 50) - 0.5) * 70, y: y + rnd(i + 90) * 64 - 8,
      r: 4.5 + rnd(i + 7) * 5.5, c: ['#ffc7dc', '#ff9ec4', '#fff1f6'][i % 3], o: 0.65 + rnd(i + 3) * 0.3,
    };
  });
  return (
    <svg viewBox="0 0 400 220" className="w-full" aria-hidden>
      <path d="M400 10 Q250 40 40 170" fill="none" stroke="#1b0f16" strokeWidth="7" strokeLinecap="round" />
      {twigs.map((t, i) => (
        <path key={i} d={`M${t.x} ${t.y} Q${t.x - 4} ${(t.y + t.ey) / 2} ${t.ex} ${t.ey}`} fill="none" stroke="#1b0f16" strokeWidth="2.5" strokeLinecap="round" />
      ))}
      {blossoms.map((b, i) => (
        <g key={i} opacity={b.o}>
          <circle cx={b.x} cy={b.y} r={b.r} fill={b.c} />
          <circle cx={b.x} cy={b.y} r={b.r * 0.3} fill="#e0568a" />
        </g>
      ))}
    </svg>
  );
};


// ─── Component ───────────────────────────────────────────────────────────────

interface FireworksGameProps {
  soundEnabled: boolean;
}

const FireworksGame: React.FC<FireworksGameProps> = ({ soundEnabled }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shape, setShape] = useState<Shape>('random');
  const [auto, setAuto] = useState(false);
  const [hinted, setHinted] = useState(false);
  const [name, setName] = useState('');
  const launchTextRef = useRef<(text: string) => void>(() => {});
  const previewRef = useRef<(s: Shape) => void>(() => {});

  const { playLaunch, playBoom } = useFireworkSound(soundEnabled);

  // The animation loop lives in one effect; it reads the latest settings through refs.
  const shapeRef = useRef(shape);
  const autoRef = useRef(auto);
  const soundRef = useRef({ playLaunch, playBoom });
  shapeRef.current = shape;
  autoRef.current = auto;
  soundRef.current = { playLaunch, playBoom };

  const stars = useMemo(
    () => Array.from({ length: 90 }, () => ({
      x: Math.random() * 100, y: Math.random() * 60,
      s: Math.random() * 1.8 + 0.5, o: Math.random() * 0.6 + 0.2,
    })),
    []
  );

  const petals = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      left: rnd(i + 1) * 100, dx: (rnd(i + 20) - 0.5) * 260,
      dur: 20 + rnd(i + 40) * 12, delay: -rnd(i + 60) * 32, size: 7 + rnd(i + 80) * 6,
    })),
    []
  );

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    // Render at the device's native pixel ratio (3x on recent iPhones) so streaks stay sharp. If a
    // device can't keep up, the ratio steps down gradually (never below 1.5x) instead of stuttering.
    let dpr = Math.min(window.devicePixelRatio || 1, 3);
    let w = 0, h = 0, wl = 0;
    const resize = () => {
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      wl = h * WATERLINE;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const rockets: Rocket[] = [];
    const particles: Particle[] = [];
    const flashes: Flash[] = [];
    const scheduled: Scheduled[] = [];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    const launch = (tx: number, ty: number, o: { text?: string; shape?: BurstShape; hue?: number } = {}) => {
      const targetY = Math.min(ty, wl - 90);
      const sx = Math.max(20, Math.min(w - 20, tx + rand(-0.1, 0.1) * h));
      const dx = tx - sx, dy = targetY - wl;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = Math.max(7, Math.min(17, dist / 45));
      const picked = shapeRef.current;
      rockets.push({
        x: sx, y: wl, tx, ty: targetY,
        vx: (dx / dist) * speed, vy: (dy / dist) * speed,
        hue: o.hue ?? (() => { const c = pick(PALETTE); return c < 0 ? c : c + rand(-8, 8); })(),
        shape: o.text ? 'text' : o.shape ?? (picked === 'random' ? pick(BURST_SHAPES) : picked),
        text: o.text,
      });
      soundRef.current.playLaunch();
      setHinted(true);
    };

    const launchRandom = () => launch(rand(w * 0.12, w * 0.88), rand(h * 0.1, wl * 0.5));

    // Picking a shape fires one right away so you can see what it looks like.
    previewRef.current = (sh: Shape) =>
      launch(w / 2 + rand(-0.08, 0.08) * w, wl * 0.36, { shape: sh === 'random' ? pick(BURST_SHAPES) : (sh as BurstShape) });

    // Name show: a staggered volley of big colourful shells first, then the name itself.
    launchTextRef.current = (text: string) => {
      for (let i = 0; i < VOLLEY; i++) {
        scheduled.push({
          t: i * 16,
          fn: () => launch(
            w * (0.12 + 0.76 * (i / (VOLLEY - 1))) + rand(-0.04, 0.04) * w,
            rand(h * 0.12, wl * 0.46),
            { shape: pick(BURST_SHAPES), hue: PALETTE[(i * 4) % PALETTE.length] },
          ),
        });
      }
      scheduled.push({ t: VOLLEY * 16 + 105, fn: () => launch(w / 2, wl * 0.42, { text }) });
    };

    const spawn = (x: number, y: number, vx: number, vy: number, h0: number, o: Partial<Particle> = {}) => {
      if (particles.length >= MAX_PARTICLES) return;
      particles.push({
        x, y, vx, vy,
        life: 1, decay: rand(0.0065, 0.0105), h0, h1: h0,
        sat: 100, size: rand(1.4, 2.4), trail: 2,
        gravity: 0.04, friction: 0.965, fade: 1.5, sparkle: false, crackle: false, noGlow: false, droop: 0, twinkle: false, ...o,
      });
    };

    // A real shell is one clear colour, and some change to a second colour as they burn down.
    // `seed` forces the main colour; a negative hue means silver-white.
    const shellColors = (seed?: number) => {
      const base = seed ?? pick(PALETTE);
      const others = PALETTE.filter((c) => c >= 0 && (base < 0 || Math.abs(c - base) > 50));
      const change = Math.random() < 0.35 ? pick(others) : base;
      return { base, change, at: () => base };
    };

    // A 3D shell seen from the side: projected radius is sqrt(1-u²), which packs particles
    // toward the rim so the sphere reads as round and full.
    const sphere = (x: number, y: number, count: number, v0: number, hueAt: (a: number) => number, o: (h: number) => Partial<Particle>) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const u = rand(-1, 1);
        const v = v0 * Math.sqrt(1 - u * u) * rand(0.92, 1.04);
        const base = hueAt(a);
        const silver = base < 0;
        const hue = silver ? 210 : base + rand(-6, 6);
        spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, hue, { sat: silver ? 8 : 100, ...o(hue) });
      }
    };

    const explode = (r: Rocket) => {
      const R = Math.max(95, Math.min(310, Math.min(w, h * 1.1) * 0.36));
      const fric = 0.965;
      const v0 = R * (1 - fric);
      const main = shellColors(r.hue);
      const inner = shellColors(pick(PALETTE.filter((c) => c !== main.base)));
      // Colour-changing shells fade from their main colour to a second one.
      const toNext = (hue: number) => (main.change === main.base ? hue : main.change);

      switch (r.shape) {
        case 'kiku': {
          // Chrysanthemum: long comet tails that curve and fall, ending in glitter, with a contrasting core.
          sphere(r.tx, r.ty, 220, v0 * 1.12, main.at, (hue) => ({
            h1: toNext(hue), trail: 9, size: 2.1, gravity: 0.055, decay: rand(0.005, 0.0075), crackle: Math.random() < 0.35,
          }));
          sphere(r.tx, r.ty, 60, v0 * 0.45, inner.at, () => ({ trail: 4, size: 2, decay: rand(0.008, 0.011) }));
          break;
        }
        case 'botan': {
          // Peony: a perfectly round ball of bright, tail-less stars that burn out quickly.
          sphere(r.tx, r.ty, 380, v0 * 0.95, main.at, (hue) => ({
            h1: toNext(hue), trail: 0.5, size: rand(2.2, 3.3), gravity: 0.015, fade: 2.5,
            decay: rand(0.009, 0.013), sparkle: Math.random() < 0.3,
          }));
          break;
        }
        case 'double': {
          // Two-layer shell: a flat ring of a second colour inside a broad outer sphere, white-gold pistil.
          sphere(r.tx, r.ty, 200, v0 * 1.1, main.at, () => ({ trail: 2.5, size: 2.3, decay: rand(0.006, 0.009) }));
          const ring = 80;
          const tilt = rand(0.45, 1);
          for (let i = 0; i < ring; i++) {
            const a = (i / ring) * Math.PI * 2;
            const hue = inner.at();
            spawn(r.tx, r.ty, Math.cos(a) * v0 * 0.6, Math.sin(a) * v0 * 0.6 * tilt, hue < 0 ? 210 : hue, {
              sat: hue < 0 ? 8 : 100, size: 3, trail: 1.5, decay: rand(0.007, 0.009),
            });
          }
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            spawn(r.tx, r.ty, Math.cos(a) * v0 * 0.2, Math.sin(a) * v0 * 0.2, 48, { sat: 40, size: 2, decay: 0.011 });
          }
          break;
        }
        case 'willow': {
          // Shidare-yanagi: slow drooping tails, classic gold (sometimes silver), crackling as they fall.
          const willowHue = Math.random() < 0.25 ? -1 : 40;
          sphere(r.tx, r.ty, 190, v0 * 0.85, () => willowHue, (hue) => ({
            h1: willowHue < 0 ? hue : 28, trail: 5, size: 2.1, gravity: 0.065, friction: 0.972,
            decay: rand(0.0025, 0.0042), sparkle: true, crackle: Math.random() < 0.3,
          }));
          break;
        }
        case 'text': {
          // The name is born inside a real burst: a big chrysanthemum blooms around it while gold
          // and silver glitter stars fly out from the same centre, settle into letters, flicker like
          // burning embers, then drift down as golden rain.
          // Fit the text to the screen: nearly full width, and the sky between lanterns and horizon.
          const { pts, scale } = textPoints(r.text ?? '', w * (w < 600 ? 0.92 : 0.8), wl * 0.52, Math.min(h * 0.2, 150));
          // Smaller letters get finer stars so long lines stay crisp instead of merging into blobs.
          const m = Math.max(0.42, Math.min(1.1, scale / 0.9));
          const vt = (1 - fric) / fric;
          // Wide, sparse halo so its streaks stay well outside the letters.
          sphere(r.tx, r.ty, 170, v0 * 1.9, main.at, (hue) => ({
            h1: toNext(hue), trail: 4, size: 2.1, decay: rand(0.0042, 0.0062), crackle: Math.random() < 0.2,
          }));
          // Name stars: glowing gold embers scattered along the letters. Each one has its own size,
          // flicker and lifetime, so the name shimmers like burning fire and dissolves into rain.
          for (const [px, py] of pts) {
            spawn(r.tx, r.ty, px * vt + rand(-0.06, 0.06), py * vt + rand(-0.06, 0.06), rand(30, 52), {
              sat: rand(80, 100), size: rand(1.4, 2.5) * m, noGlow: m < 0.8 || Math.random() < 0.55, trail: 1.6, gravity: 0.0015, droop: 0.03, sparkle: true,
              decay: rand(0.0015, 0.0026), fade: 5, twinkle: true, crackle: Math.random() < 0.05,
            });
          }
          break;
        }
      }
      flashes.push({ x: r.tx, y: r.ty, life: 1, hue: r.hue < 0 ? 210 : r.hue, rad: R * 1.7 });
      soundRef.current.playBoom(r.shape === 'text' ? 1 : 0.45 + 0.55 * (R / 310));
    };

    // ── Input ──
    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      launch(e.clientX - rect.left, e.clientY - rect.top);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === ' ') e.preventDefault();
      launchRandom();
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    // ── Loop ──
    let raf = 0;
    let last = performance.now();
    let autoTimer = 0;

    // Draw a streak plus its reflection in the river below the waterline.
    const streak = (x1: number, y1: number, x2: number, y2: number, style: string, mirrorStyle: string, width: number) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = mirrorStyle;
      ctx.beginPath();
      ctx.moveTo(x1, 2 * wl - y1);
      ctx.lineTo(x2, 2 * wl - y2);
      ctx.stroke();
    };

    let slowFrames = 0, busyFrames = 0;
    const frame = (now: number) => {
      const elapsed = now - last;
      const dt = Math.min(elapsed / 16.667, 3);
      last = now;

      // Only judge performance while the sky is busy, and only ever step the resolution down.
      if (particles.length > 400 && elapsed < 200) {
        busyFrames++;
        if (elapsed > 26) slowFrames++;
        if (busyFrames >= 45) {
          if (slowFrames > 18 && dpr > 1.5) { dpr = Math.max(1.5, dpr - 0.5); resize(); }
          busyFrames = 0; slowFrames = 0;
        }
      }

      for (let i = scheduled.length - 1; i >= 0; i--) {
        scheduled[i].t -= dt;
        if (scheduled[i].t <= 0) { const { fn } = scheduled[i]; scheduled.splice(i, 1); fn(); }
      }

      if (autoRef.current) {
        autoTimer -= dt;
        if (autoTimer <= 0) {
          launchRandom();
          if (Math.random() < 0.3) launchRandom(); // occasional double volley
          autoTimer = rand(40, 100);
        }
      }

      // Wipe fully when idle so no faint ghosting remains from the trail fade.
      if (!rockets.length && !particles.length && !flashes.length) {
        ctx.clearRect(0, 0, w, h);
        raf = requestAnimationFrame(frame);
        return;
      }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${0.12 * Math.min(dt, 2)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      // Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        const px = r.x, py = r.y;
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        streak(px, py, r.x, r.y, 'rgba(255,236,200,0.95)', 'rgba(255,236,200,0.25)', 2.6);
        spawn(r.x, r.y, rand(-0.5, 0.5), rand(0.4, 1.2), 38, {
          life: 0.6, decay: 0.045, size: 1.3, gravity: 0.02, friction: 0.95, trail: 1.5,
        });
        if (Math.hypot(r.tx - r.x, r.ty - r.y) <= Math.hypot(r.vx, r.vy) * dt) {
          explode(r);
          rockets.splice(i, 1);
        }
      }

      // Burst flashes light up the whole sky
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        const rad = f.rad * (1.25 - f.life * 0.35);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rad);
        g.addColorStop(0, `hsla(${f.hue},100%,85%,${0.45 * f.life})`);
        g.addColorStop(0.4, `hsla(${f.hue},100%,60%,${0.14 * f.life})`);
        g.addColorStop(1, `hsla(${f.hue},100%,50%,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(f.x - rad, f.y - rad, rad * 2, rad * 2);
        f.life -= 0.045 * dt;
        if (f.life <= 0) flashes.splice(i, 1);
      }

      // Particles
      const glow = particles.length < 2600;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const fr = Math.pow(p.friction, dt);
        p.vx *= fr; p.vy *= fr;
        p.vy += p.gravity * dt;
        if (p.droop && p.life < 0.18) p.vy += p.droop * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.life -= p.decay * dt;

        if (p.life <= 0 || p.y > wl) {
          if (p.life <= 0 && p.crackle) {
            for (let k = 0; k < 3; k++) {
              spawn(p.x, p.y, rand(-1.6, 1.6), rand(-1.6, 1.6), 50, {
                sat: 15, life: 0.5, decay: 0.05, size: 1.6, trail: 1, sparkle: true, gravity: 0.03,
              });
            }
          }
          particles.splice(i, 1);
          continue;
        }

        let alpha = Math.min(1, p.life * p.fade);
        if (p.sparkle && p.life < 0.5 && Math.random() < 0.4) alpha *= 0.2;
        if (p.twinkle) alpha *= 0.62 + 0.38 * Math.random();
        const age = 1 - p.life;
        const hue = p.h0 + (p.h1 - p.h0) * age;
        const light = 56 + 36 * Math.max(0, (p.life - 0.85) / 0.15); // white-hot at birth
        const tx = p.x - p.vx * p.trail * dt;
        const ty = p.y - p.vy * p.trail * dt;
        const col = `hsla(${hue},${p.sat}%,${light}%,${alpha})`;
        const refl = `hsla(${hue},${p.sat}%,${light}%,${alpha * 0.22})`;
        if (glow && !p.noGlow && p.size > 1.8) {
          ctx.strokeStyle = `hsla(${hue},100%,55%,${alpha * 0.1})`;
          ctx.lineWidth = p.size * 2.3;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        streak(tx, ty, p.x, p.y, col, refl, p.size);
        // Bright, thin core on top: gives every star a hard, sharp centre instead of a soft blob.
        if (p.size > 1.6) {
          ctx.strokeStyle = `hsla(${hue},${p.sat * 0.35}%,90%,${alpha})`;
          ctx.lineWidth = p.size * 0.42;
          ctx.beginPath();
          ctx.moveTo(tx + (p.x - tx) * 0.5, ty + (p.y - ty) * 0.5);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    const text = name.trim();
    if (!text) return;
    launchTextRef.current(text);
    setName('');
  };

  const waterPct = `${(1 - WATERLINE) * 100}%`;

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden select-none"
      style={{
        height: 'calc(100dvh - 56px)',
        background: 'linear-gradient(180deg, #03020c 0%, #0a0a26 40%, #1b1445 75%, #3a2252 100%)',
      }}
    >
      <style>{`
        @keyframes hanabi-glow{0%,100%{opacity:1}50%{opacity:.82}}
        @keyframes hanabi-petal{0%{transform:translate3d(0,-8vh,0) rotate(0deg)}100%{transform:translate3d(var(--dx),108vh,0) rotate(540deg)}}
        @keyframes hanabi-flag{0%,100%{transform:skewY(0deg)}50%{transform:skewY(1.6deg)}}
      `}</style>

      {/* Stars + moon */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {stars.map((s, i) => (
          <span key={i} className="absolute rounded-full bg-white"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: s.o }} />
        ))}
        <div className="absolute rounded-full"
          style={{
            left: '74%', top: '8%', width: 42, height: 42,
            background: 'radial-gradient(circle at 38% 38%, #fffbe8 0%, #f4e8b8 60%, #d9c98a 100%)',
            boxShadow: '0 0 26px 8px rgba(255,244,200,0.35), 0 0 80px 26px rgba(255,244,200,0.12)',
          }} />
        {/* Dusk afterglow on the horizon */}
        <div className="absolute inset-x-0" style={{
          top: '35%', bottom: waterPct,
          background: 'radial-gradient(ellipse 75% 60% at 50% 100%, rgba(255,120,140,0.26), transparent 70%)',
        }} />
      </div>

      {/* Shore silhouette */}
      <div className="absolute left-0 w-full pointer-events-none" style={{ bottom: waterPct, height: LAND_H }}>
        <Landscape />
      </div>

      {/* River: flipped reflection, seigaiha wave pattern, depth tint, moon glitter */}
      <div className="absolute left-0 w-full overflow-hidden pointer-events-none" style={{
        top: `${WATERLINE * 100}%`, bottom: 0,
        // Mirrors the dusk sky at the horizon (pink afterglow, lighter violet), deepening with depth.
        background: 'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(255,120,140,0.2), transparent 75%), linear-gradient(180deg, #33245a 0%, #241a4e 30%, #120d33 70%, #080616 100%)',
      }}>
        <div className="absolute left-0 top-0 w-full" style={{ height: LAND_H, transform: 'scaleY(-1)', opacity: 0.8, filter: 'url(#hanabi-ripple) blur(0.8px)' }}>
          <Landscape />
        </div>
        <svg className="absolute inset-0 w-full h-full" aria-hidden>
          <defs>
            <filter id="hanabi-ripple" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.004 0.09" numOctaves="2" seed="4" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <pattern id="seigaiha" width="48" height="24" patternUnits="userSpaceOnUse">
              {[[24, 24], [0, 12], [48, 12]].map(([cx, cy]) =>
                [24, 18, 12, 6].map((r) => (
                  <circle key={`${cx}-${cy}-${r}`} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(160,170,255,0.13)" strokeWidth="1" />
                ))
              )}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#seigaiha)" />
        </svg>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,6,24,0) 0%, rgba(5,4,18,0.45) 100%)' }} />
      </div>

      {/* Sakura branch */}
      <div className="absolute top-0 right-0 w-[26%] max-w-[260px] pointer-events-none" aria-hidden>
        <SakuraBranch />
      </div>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ touchAction: 'none' }}
        aria-label="Fireworks over a river — tap to launch a firework"
      />

      {/* Drifting sakura petals */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {petals.map((p, i) => (
          <span key={i} className="absolute top-0"
            style={{
              left: `${p.left}%`, width: p.size, height: p.size * 0.7,
              background: 'linear-gradient(135deg, #ffd3e3, #ff9ec4)', borderRadius: '80% 0 80% 0', opacity: 0.75,
              ['--dx' as string]: `${p.dx}px`, animation: `hanabi-petal ${p.dur}s linear ${p.delay}s infinite`,
            }} />
        ))}
      </div>

      {/* Hint */}
      {!hinted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="px-5 py-2.5 rounded-full text-sm font-bold text-white/85 bg-white/10 backdrop-blur-sm animate-pulse">
            Tap anywhere · or press any key
          </p>
        </div>
      )}

      {/* Name input: fires a volley, then spells the text out in fireworks */}
      <form
        onSubmit={submitName}
        className="absolute bottom-[4.25rem] left-1/2 -translate-x-1/2 w-[min(92%,26rem)] flex items-center gap-1 p-1 pl-4 rounded-full"
        style={{ background: 'rgba(20,18,50,0.72)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="Type a name to light up the sky…"
          aria-label="Name to spell in fireworks"
          className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-white/45 outline-none"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex items-center gap-1.5 min-h-[36px] px-4 rounded-full text-xs font-bold whitespace-nowrap bg-amber-400 text-stone-900 disabled:opacity-40 transition-opacity"
        >
          <Send size={13} /> Launch
        </button>
      </form>

      {/* Controls */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] flex items-center gap-1 p-1 rounded-full overflow-x-auto"
        style={{ background: 'rgba(20,18,50,0.72)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}
      >
        {SHAPES.map((s) => (
          <button
            key={s.id}
            onClick={() => { setShape(s.id); previewRef.current(s.id); }}
            aria-pressed={shape === s.id}
            title={s.label}
            className={`flex items-center gap-1.5 min-h-[36px] px-3 rounded-full text-xs font-bold whitespace-nowrap transition-colors
              ${shape === s.id ? 'bg-white text-stone-900' : 'text-white/75 hover:bg-white/10'}`}
          >
            {s.icon}
            <span className="hidden md:inline">{s.label}</span>
          </button>
        ))}
        <span className="w-px h-5 mx-1 bg-white/20 flex-shrink-0" />
        <button
          onClick={() => setAuto((a) => !a)}
          aria-pressed={auto}
          className={`flex items-center gap-1.5 min-h-[36px] px-3 rounded-full text-xs font-bold whitespace-nowrap transition-colors
            ${auto ? 'bg-amber-400 text-stone-900' : 'text-white/75 hover:bg-white/10'}`}
        >
          {auto ? <Pause size={13} /> : <Play size={13} />}
          Auto
        </button>
      </div>
    </div>
  );
};

export default FireworksGame;
