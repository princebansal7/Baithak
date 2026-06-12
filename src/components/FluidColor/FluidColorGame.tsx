import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Zap, CloudRain, Waves, Eraser, Trash2, X } from 'lucide-react';
import { FluidSim } from './fluidSim';

// ─── Color utils ─────────────────────────────────────────────────────────────

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const rows: [number, number, number][] = [
    [v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q],
  ];
  return rows[i];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const v = mx, s = mx === 0 ? 0 : (mx - mn) / mx;
  let h = 0;
  if (mx !== mn) {
    const d = mx - mn;
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  return [h, s, v];
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}

const rgbCss = (r: number, g: number, b: number) =>
  `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

const rgbHex = (r: number, g: number, b: number) =>
  [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();

// ─── Constants ────────────────────────────────────────────────────────────────

// 5 vivid preset colors
const PRESETS: { label: string; c: [number, number, number] }[] = [
  { label: 'Crimson', c: [1,    0.06, 0.06] },
  { label: 'Amber',   c: [1,    0.55, 0.02] },
  { label: 'Emerald', c: [0.04, 0.88, 0.30] },
  { label: 'Azure',   c: [0.04, 0.30, 1   ] },
  { label: 'Violet',  c: [0.62, 0.06, 1   ] },
];

type Tool = 'paint' | 'explosion' | 'rain' | 'wave' | 'eraser';

const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: 'paint',     icon: <Droplets  size={13} />, label: 'Paint'   },
  { id: 'explosion', icon: <Zap       size={13} />, label: 'Burst'   },
  { id: 'rain',      icon: <CloudRain size={13} />, label: 'Rain'    },
  { id: 'wave',      icon: <Waves     size={13} />, label: 'Wave'    },
  { id: 'eraser',    icon: <Eraser    size={13} />, label: 'Erase'   },
];

// Clean 3-stop gradient for the "pick custom color" button
const CUSTOM_BTN_BG = 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #6366f1 100%)';

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { isDark: boolean }

type ColorSource = number | 'custom'; // 0-4 = preset index, 'custom' = picker

// CSS background colours matching the fluid sim bgColor uniform
const DARK_BG  = '#04030c';
const LIGHT_BG = '#f3ede2'; // warm cream/ivory

const bgRgb = (dark: boolean): [number, number, number] =>
  dark ? [0.016, 0.012, 0.047] : [0.953, 0.929, 0.886];

const FluidColorGame: React.FC<Props> = ({ isDark }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const simRef     = useRef<FluidSim | null>(null);
  const ptrRef     = useRef({ x: 0, y: 0, down: false });
  const svBoxRef   = useRef<HTMLDivElement>(null);
  const hueBarRef  = useRef<HTMLDivElement>(null);

  const [noWebGL, setNoWebGL] = useState(false);

  // Active color source
  const [source, setSource]           = useState<ColorSource>(0);
  const [customRgb, setCustomRgb]     = useState<[number, number, number]>([0.5, 0.3, 1]);

  // HSV state for the picker (tracks what's in the picker, not necessarily active)
  const [hue, setHue] = useState(260);
  const [sat, setSat] = useState(0.7);
  const [val, setVal] = useState(1.0);
  const [hexInput, setHexInput] = useState('');

  useEffect(() => {
    setHexInput(rgbHex(...hsvToRgb(hue, sat, val)));
  }, [hue, sat, val]);

  const [showPicker, setShowPicker] = useState(false);
  const [tool, setTool]             = useState<Tool>('paint');

  // Derived active color
  const activeColor: [number, number, number] =
    source === 'custom' ? customRgb : PRESETS[source as number].c;
  const [cr, cg, cb] = activeColor;

  // ── Sim lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sim = new FluidSim();
    if (!sim.init(canvas)) { setNoWebGL(true); return; }
    sim.config.bgColor = bgRgb(isDark);
    sim.config.isDark  = isDark;
    simRef.current = sim;
    sim.scatter(PRESETS.map(p => p.c));
    sim.start();
    return () => { sim.destroy(); simRef.current = null; };
  }, []); // eslint-disable-line

  // Keep background colour and dark flag in sync with theme changes
  useEffect(() => {
    if (simRef.current) {
      simRef.current.config.bgColor = bgRgb(isDark);
      simRef.current.config.isDark  = isDark;
    }
  }, [isDark]);

  // ── Refs to avoid stale closures ─────────────────────────────────────────────
  const colorRef = useRef(activeColor);
  const toolRef  = useRef(tool);
  useEffect(() => { colorRef.current = activeColor; }); // eslint-disable-line
  useEffect(() => { toolRef.current  = tool; },          [tool]);

  // ── Canvas helpers ───────────────────────────────────────────────────────────
  const getNorm = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const applyAt = useCallback((x: number, y: number, dx = 0, dy = 0) => {
    const sim = simRef.current;
    if (!sim) return;
    const c = colorRef.current;
    switch (toolRef.current) {
      case 'paint':     sim.splat({ x, y, dx, dy, color: c }); break;
      case 'explosion': sim.explosion(x, y, c);                 break;
      case 'rain':      sim.rain(c);                            break;
      case 'wave':      sim.wave(0, c);                         break;
      case 'eraser':    sim.erase(x, y);                        break;
    }
  }, []);

  // ── Pointer events ───────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setShowPicker(false);
    const { x, y } = getNorm(e);
    ptrRef.current = { x, y, down: true };
    applyAt(x, y);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!ptrRef.current.down) return;
    const { x, y } = getNorm(e);
    const dx = x - ptrRef.current.x;
    const dy = y - ptrRef.current.y;
    if (toolRef.current === 'paint' || toolRef.current === 'eraser') {
      applyAt(x, y, dx * 3, dy * 3);
    }
    ptrRef.current = { ...ptrRef.current, x, y };
  };

  const onPointerUp = () => { ptrRef.current.down = false; };

  // ── Picker drag ──────────────────────────────────────────────────────────────
  const dragSV = (e: React.MouseEvent | React.TouchEvent) => {
    const el = svBoxRef.current;
    if (!el) return;
    const r  = el.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setSat(Math.max(0, Math.min(1, (cx - r.left) / r.width)));
    setVal(Math.max(0, Math.min(1, 1 - (cy - r.top) / r.height)));
  };

  const dragHue = (e: React.MouseEvent | React.TouchEvent) => {
    const el = hueBarRef.current;
    if (!el) return;
    const r  = el.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setHue(Math.round(Math.max(0, Math.min(359, ((cx - r.left) / r.width) * 360))));
  };

  // ── Derived CSS ──────────────────────────────────────────────────────────────
  const activeCss  = rgbCss(cr, cg, cb);
  const pureHueCss = `hsl(${hue},100%,50%)`;
  const pickerRgb  = hsvToRgb(hue, sat, val);
  const pickerCss  = rgbCss(...pickerRgb);

  if (noWebGL) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm"
        style={{ background: isDark ? DARK_BG : LIGHT_BG, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}
      >
        WebGL2 is required. Please use a modern browser.
      </div>
    );
  }

  const circleBtn = (active: boolean) =>
    `flex items-center justify-center rounded-full border-2 transition-all duration-150 select-none cursor-pointer
     ${active ? 'scale-110' : 'hover:scale-105 active:scale-95'}`;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100dvh - 56px)' }}>

      {/* ── Canvas ─────────────────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none select-none"
        style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair', background: isDark ? DARK_BG : LIGHT_BG, transition: 'background 0.4s' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* ── Floating palette ───────────────────────────────────────────────── */}
      <div className="absolute bottom-5 left-0 right-0 flex justify-center z-20 pointer-events-none px-3">

        {/* Desktop — single pill */}
        <div
          className="pointer-events-auto hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full shadow-xl"
          style={{
            background: isDark ? 'rgba(6,4,18,0.88)' : 'rgba(255,255,255,0.88)',
            border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {PRESETS.map(({ label, c }, i) => {
            const active = source === i;
            return (
              <button key={i} title={label} onClick={() => setSource(i)} className={circleBtn(active)}
                style={{
                  width: 28, height: 28,
                  background: rgbCss(...c),
                  borderColor: active ? 'white' : 'transparent',
                  boxShadow: active ? `0 0 0 2px rgba(255,255,255,0.15), 0 0 12px ${rgbCss(...c)}80` : undefined,
                }}
              />
            );
          })}
          <button title="Custom color" onClick={() => setShowPicker(p => !p)} className={circleBtn(source === 'custom' || showPicker)}
            style={{
              width: 28, height: 28,
              background: source === 'custom' ? rgbCss(...customRgb) : CUSTOM_BTN_BG,
              borderColor: (source === 'custom' || showPicker) ? 'white' : 'transparent',
              opacity: (source === 'custom' || showPicker) ? 1 : 0.75,
            }}
          />
          <div className="w-px h-5 mx-0.5 flex-shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.10)' }} />
          {TOOLS.map(({ id, icon, label }) => {
            const active = tool === id;
            return (
              <button key={id} title={label} onClick={() => setTool(id)} className={circleBtn(active)}
                style={{
                  width: 28, height: 28,
                  background: active ? 'rgba(139,92,246,0.85)' : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                  borderColor: active ? 'rgba(167,139,250,0.6)' : 'transparent',
                  color: active ? 'white' : isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
                  boxShadow: active ? '0 0 12px rgba(139,92,246,0.55)' : undefined,
                }}
              >{icon}</button>
            );
          })}
          <div className="w-px h-5 mx-0.5 flex-shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.10)' }} />
          <button title="Clear" onClick={() => simRef.current?.clearCanvas()} className={circleBtn(false)}
            style={{
              width: 28, height: 28,
              background: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.10)',
              borderColor: 'transparent',
              color: isDark ? 'rgba(252,165,165,0.80)' : 'rgba(185,28,28,0.70)',
            }}
          ><Trash2 size={12} /></button>
        </div>

        {/* Mobile — two stacked pills */}
        <div className="pointer-events-auto flex sm:hidden flex-col items-center gap-2">

          {/* Colors pill */}
          <div
            className="flex items-center gap-2 px-3.5 py-2 rounded-full shadow-xl"
            style={{
              background: isDark ? 'rgba(6,4,18,0.88)' : 'rgba(255,255,255,0.88)',
              border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {PRESETS.map(({ label, c }, i) => {
              const active = source === i;
              return (
                <button key={i} title={label} onClick={() => setSource(i)} className={circleBtn(active)}
                  style={{
                    width: 30, height: 30,
                    background: rgbCss(...c),
                    borderColor: active ? 'white' : 'transparent',
                    boxShadow: active ? `0 0 0 2px rgba(255,255,255,0.15), 0 0 10px ${rgbCss(...c)}80` : undefined,
                  }}
                />
              );
            })}
            <button title="Custom color" onClick={() => setShowPicker(p => !p)} className={circleBtn(source === 'custom' || showPicker)}
              style={{
                width: 30, height: 30,
                background: source === 'custom' ? rgbCss(...customRgb) : CUSTOM_BTN_BG,
                borderColor: (source === 'custom' || showPicker) ? 'white' : 'transparent',
                opacity: (source === 'custom' || showPicker) ? 1 : 0.75,
              }}
            />
          </div>

          {/* Tools pill */}
          <div
            className="flex items-center gap-2 px-3.5 py-2 rounded-full shadow-xl"
            style={{
              background: isDark ? 'rgba(6,4,18,0.88)' : 'rgba(255,255,255,0.88)',
              border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {TOOLS.map(({ id, icon, label }) => {
              const active = tool === id;
              return (
                <button key={id} title={label} onClick={() => setTool(id)} className={circleBtn(active)}
                  style={{
                    width: 30, height: 30,
                    background: active ? 'rgba(139,92,246,0.85)' : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    borderColor: active ? 'rgba(167,139,250,0.6)' : 'transparent',
                    color: active ? 'white' : isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
                    boxShadow: active ? '0 0 12px rgba(139,92,246,0.55)' : undefined,
                  }}
                >{icon}</button>
              );
            })}
            <div className="w-px h-4 flex-shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.10)' }} />
            <button title="Clear" onClick={() => simRef.current?.clearCanvas()} className={circleBtn(false)}
              style={{
                width: 30, height: 30,
                background: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.10)',
                borderColor: 'transparent',
                color: isDark ? 'rgba(252,165,165,0.80)' : 'rgba(185,28,28,0.70)',
              }}
            ><Trash2 size={12} /></button>
          </div>
        </div>
      </div>

      {/* ── Current color indicator (top-left glow dot) ─────────────────────── */}
      <div
        className="absolute top-4 left-4 z-10 w-7 h-7 rounded-full pointer-events-none"
        style={{
          background: activeCss,
          boxShadow: isDark
            ? `0 0 0 2px rgba(255,255,255,0.22), 0 0 20px ${activeCss}88`
            : `0 0 0 2px rgba(0,0,0,0.18), 0 0 14px ${activeCss}66`,
          transition: 'background 0.3s, box-shadow 0.3s',
        }}
      />

      {/* ── Custom color picker overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 400 }}
            className="absolute z-30 inset-x-3 sm:inset-x-0 flex justify-center pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)' }}
          >
            <div
              className="pointer-events-auto rounded-2xl shadow-2xl w-full sm:w-[230px]"
              style={{
                background: isDark ? 'rgba(8,6,22,0.97)' : 'rgba(252,249,245,0.97)',
                border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
                backdropFilter: 'blur(28px)',
              }}
            >
              <div className="p-3">
                {/* Header: swatch + hex + close */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div
                    className="flex-shrink-0 rounded-lg"
                    style={{
                      width: 32, height: 32,
                      background: pickerCss,
                      boxShadow: `0 0 10px ${pickerCss}55`,
                    }}
                  />
                  <div
                    className="flex items-center flex-1 rounded-lg px-2 py-1.5 min-w-0"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                    }}
                  >
                    <span className="text-[11px] font-mono mr-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)' }}>#</span>
                    <input
                      className="flex-1 bg-transparent text-[11px] font-mono outline-none uppercase tracking-wider min-w-0"
                      style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.78)' }}
                      value={hexInput}
                      maxLength={6}
                      spellCheck={false}
                      onChange={e => {
                        const v = e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '');
                        setHexInput(v);
                        const rgb = hexToRgb(v);
                        if (rgb) {
                          const [h, s, va] = rgbToHsv(...rgb);
                          setHue(h); setSat(s); setVal(va);
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setShowPicker(false)}
                    className="flex-shrink-0 flex items-center justify-center rounded-lg w-7 h-7 transition-colors"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                      color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>

                {/* SV gradient box */}
                <div
                  ref={svBoxRef}
                  className="relative w-full rounded-xl mb-2 cursor-crosshair select-none"
                  style={{
                    height: 120,
                    background: `linear-gradient(to top, #000 0%, transparent 100%),
                                 linear-gradient(to right, #fff 0%, ${pureHueCss} 100%)`,
                  }}
                  onMouseDown={e => { e.preventDefault(); dragSV(e); }}
                  onMouseMove={e => { if (e.buttons === 1) dragSV(e); }}
                  onTouchStart={e => { e.preventDefault(); dragSV(e); }}
                  onTouchMove={e => { e.preventDefault(); dragSV(e); }}
                >
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${sat * 100}%`, top: `${(1 - val) * 100}%`,
                      transform: 'translate(-50%,-50%)',
                      width: 16, height: 16,
                      borderRadius: '50%',
                      background: pickerCss,
                      border: '2px solid white',
                      boxShadow: '0 0 0 1.5px rgba(0,0,0,0.45)',
                    }}
                  />
                </div>

                {/* Hue bar */}
                <div
                  ref={hueBarRef}
                  className="relative w-full rounded-full mb-3 cursor-ew-resize select-none"
                  style={{
                    height: 12,
                    background: 'linear-gradient(to right,hsl(0,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%))',
                  }}
                  onMouseDown={e => { e.preventDefault(); dragHue(e); }}
                  onMouseMove={e => { if (e.buttons === 1) dragHue(e); }}
                  onTouchStart={e => { e.preventDefault(); dragHue(e); }}
                  onTouchMove={e => { e.preventDefault(); dragHue(e); }}
                >
                  <div
                    className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      left: `${(hue / 360) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 18, height: 18,
                      borderRadius: '50%',
                      background: pureHueCss,
                      border: '2px solid white',
                      boxShadow: '0 0 0 1.5px rgba(0,0,0,0.35)',
                    }}
                  />
                </div>

                {/* Apply button */}
                <button
                  onClick={() => {
                    setCustomRgb(pickerRgb);
                    setSource('custom');
                    setShowPicker(false);
                  }}
                  className="w-full py-2 rounded-xl text-white text-xs font-bold transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: pickerCss,
                    boxShadow: `0 3px 14px ${pickerCss}48`,
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FluidColorGame;
