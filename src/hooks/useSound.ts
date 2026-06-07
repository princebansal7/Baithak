import { useRef, useCallback } from 'react';

export function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // Soft wooden "tock" — played each time the wheel crosses a segment boundary.
  // Mellow sine tones with a tiny attack ramp (no harsh transient) routed through
  // a lowpass filter so the highs never get edgy.
  const playTick = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      // Lowpass tames any high-harmonic edge for a soothing, rounded tick
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1200, now);
      lp.Q.setValueAtTime(0.7, now);
      lp.connect(ctx.destination);

      // Soft pitched body — gentle drop, short attack to avoid a click/pop
      const tock = ctx.createOscillator();
      tock.type = 'sine';
      tock.frequency.setValueAtTime(620, now);
      tock.frequency.exponentialRampToValueAtTime(330, now + 0.05);
      const tockGain = ctx.createGain();
      tockGain.gain.setValueAtTime(0.0001, now);
      tockGain.gain.linearRampToValueAtTime(0.16, now + 0.004);
      tockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      tock.connect(tockGain);
      tockGain.connect(lp);
      tock.start(now);
      tock.stop(now + 0.08);

      // Subtle low body underneath for warmth
      const body = ctx.createOscillator();
      body.type = 'sine';
      body.frequency.setValueAtTime(150, now);
      body.frequency.exponentialRampToValueAtTime(80, now + 0.045);
      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.0001, now);
      bodyGain.gain.linearRampToValueAtTime(0.09, now + 0.005);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      body.connect(bodyGain);
      bodyGain.connect(lp);
      body.start(now);
      body.stop(now + 0.07);
    } catch {
      // silently ignore audio errors
    }
  }, [enabled, getCtx]);

  const playWin = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      // Triumphant ascending chord
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        const t = ctx.currentTime + i * 0.12;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        osc.start(t);
        osc.stop(t + 0.75);
      });

      // Extra sparkle
      setTimeout(() => {
        try {
          const sparkCtx = getCtx();
          const sparkNotes = [1046.5, 1318.5, 1568, 2093];
          sparkNotes.forEach((freq, i) => {
            const osc = sparkCtx.createOscillator();
            const gain = sparkCtx.createGain();
            osc.connect(gain);
            gain.connect(sparkCtx.destination);
            osc.type = 'sine';
            const t = sparkCtx.currentTime + i * 0.07;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.start(t);
            osc.stop(t + 0.45);
          });
        } catch { /* ignore */ }
      }, 500);
    } catch {
      // silently ignore
    }
  }, [enabled, getCtx]);

  // ── Bottle sounds ────────────────────────────────────────────
  const bottleGainRef = useRef<GainNode | null>(null);

  // Spinning-bottle sound: pre-scheduled glass ticks at every full rotation,
  // timed exactly to the physics deceleration curve — no noise, no drone.
  // θ(t) = v0 × (F^t − 1) / ln(F)  → n-th tick at t_n = ln(1 + 2πn·lnF/v0) / lnF
  const startBottleSpin = useCallback(
    (durationSec: number, initialVelocity: number) => {
      if (!enabled) return;
      try {
        const ctx = getCtx();
        const now = ctx.currentTime;

        // Master gain — fade out near end, used to silence early stops
        const master = ctx.createGain();
        master.gain.setValueAtTime(1, now);
        master.gain.setValueAtTime(1, now + durationSec * 0.72);
        master.gain.linearRampToValueAtTime(0, now + durationSec);
        master.connect(ctx.destination);
        bottleGainRef.current = master;

        const v0  = Math.abs(initialVelocity);          // rad / ms
        const LNF = Math.log(Math.pow(0.985, 1 / 16.667)); // ≈ −0.000907 ms⁻¹

        // Schedule one glass-impact pair per quarter rotation (4× more frequent)
        const TICK_INTERVAL = Math.PI / 2;
        const maxN = Math.ceil(v0 / (-LNF) / TICK_INTERVAL);
        for (let n = 1; n <= maxN; n++) {
          const arg = 1 + (TICK_INTERVAL * n * LNF) / v0;
          if (arg <= 0) break;
          const tickSec = Math.log(arg) / LNF / 1000;
          if (tickSec >= durationSec) break;

          const t = now + tickSec;

          // Low glass-body thud (felt more than heard)
          const thud = ctx.createOscillator();
          thud.type = 'sine';
          thud.frequency.setValueAtTime(320, t);
          thud.frequency.exponentialRampToValueAtTime(75, t + 0.045);
          const thudG = ctx.createGain();
          thudG.gain.setValueAtTime(0.18, t);
          thudG.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
          thud.connect(thudG); thudG.connect(master);
          thud.start(t); thud.stop(t + 0.06);

          // High glass-ring overtone (the glassy shimmer)
          const ring = ctx.createOscillator();
          ring.type = 'sine';
          ring.frequency.setValueAtTime(2400, t);
          const ringG = ctx.createGain();
          ringG.gain.setValueAtTime(0.06, t);
          ringG.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          ring.connect(ringG); ringG.connect(master);
          ring.start(t); ring.stop(t + 0.25);
        }
      } catch { /* ignore */ }
    },
    [enabled, getCtx]
  );

  const stopBottleSpin = useCallback(() => {
    try {
      if (bottleGainRef.current && ctxRef.current) {
        const ctx = ctxRef.current;
        const g = bottleGainRef.current;
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
        bottleGainRef.current = null;
      }
    } catch { /* ignore */ }
  }, []);

  const playBottleStop = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      // Glass clink — high-frequency tap with ring-down
      const tap = ctx.createOscillator();
      tap.type = 'sine';
      tap.frequency.setValueAtTime(2800, now);
      tap.frequency.exponentialRampToValueAtTime(1800, now + 0.04);
      const tapGain = ctx.createGain();
      tapGain.gain.setValueAtTime(0.5, now);
      tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      tap.connect(tapGain);
      tapGain.connect(ctx.destination);
      tap.start(now);
      tap.stop(now + 0.08);

      // Resonant ring — sustained tone
      const ring = ctx.createOscillator();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(1100, now + 0.01);
      const ringGain = ctx.createGain();
      ringGain.gain.setValueAtTime(0, now);
      ringGain.gain.linearRampToValueAtTime(0.22, now + 0.02);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      ring.connect(ringGain);
      ringGain.connect(ctx.destination);
      ring.start(now + 0.01);
      ring.stop(now + 0.95);

      // Woody surface thud (body percussion feel)
      const thud = ctx.createOscillator();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(120, now);
      thud.frequency.exponentialRampToValueAtTime(50, now + 0.07);
      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(0.35, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(now);
      thud.stop(now + 0.1);
    } catch { /* ignore */ }
  }, [enabled, getCtx]);

  return { playTick, playWin, startBottleSpin, stopBottleSpin, playBottleStop };
}
