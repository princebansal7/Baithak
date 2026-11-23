/// <reference types="vite/client" />
import { useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';

const base = import.meta.env.BASE_URL ?? './';
const FILES = [0, 1, 2].map((i) => `${base}sounds/explosion${i}.mp3`);

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// Recorded explosion samples played through Howler. Variation comes from picking a random
// sample and nudging pitch/volume. Each play is faded out early so the recordings' long, deep
// rumble tail never lingers after the burst, and pitch is never lowered.
export function useFireworkSound(enabled: boolean) {
  const howls = useRef<Howl[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    howls.current = FILES.map((src) => new Howl({ src: [src], preload: true, html5: false }));
    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      howls.current.forEach((h) => h.unload());
      howls.current = [];
    };
  }, []);

  // Play one sample, hold it for `holdMs`, then fade it out over `fadeMs` and stop.
  const play = useCallback((volume: number, rate: number, holdMs: number, fadeMs: number) => {
    const list = howls.current;
    if (!list.length) return;
    const h = list[Math.floor(Math.random() * list.length)];
    const id = h.play();
    h.volume(volume, id);
    h.rate(rate, id);
    timers.current.push(
      window.setTimeout(() => {
        h.fade(volume, 0, fadeMs, id);
        timers.current.push(window.setTimeout(() => h.stop(id), fadeMs + 30));
      }, holdMs)
    );
  }, []);

  // Soft mortar "pop" as the shell leaves the ground.
  const playLaunch = useCallback(() => {
    if (!enabled) return;
    play(0.1, rand(1.5, 1.8), 120, 150);
  }, [enabled, play]);

  // Burst boom, a beat after the flash like real distance delay. `size` 0–1: bigger = louder.
  const playBoom = useCallback((size = 0.7, delay = 0.12) => {
    if (!enabled) return;
    timers.current.push(
      window.setTimeout(() => play(0.35 + 0.5 * size, rand(1.0, 1.15), 600, 500), delay * 1000)
    );
  }, [enabled, play]);

  return { playLaunch, playBoom };
}
