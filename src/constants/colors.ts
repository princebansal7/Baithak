// Eye-soothing jewel-tone palette (Tailwind 700-level) — all pass white-text contrast
export const WHEEL_COLORS = [
  '#b91c1c', // red-700
  '#c2410c', // orange-700
  '#b45309', // amber-700
  '#15803d', // green-700
  '#047857', // emerald-700
  '#0f766e', // teal-700
  '#0e7490', // cyan-700
  '#0369a1', // sky-700
  '#1d4ed8', // blue-700
  '#4338ca', // indigo-700
  '#6d28d9', // violet-700
  '#7e22ce', // purple-700
  '#a21caf', // fuchsia-700
  '#be185d', // pink-700
  '#be123c', // rose-700
  '#9a3412', // orange-800
  '#166534', // green-800
  '#1e3a8a', // blue-800
  '#6b21a8', // purple-800
  '#9d174d', // pink-800
];

export const getColorForIndex = (index: number): string =>
  WHEEL_COLORS[index % WHEEL_COLORS.length];

// Bug fix: clamp both above 255 AND below 0 for negative amounts
export function lightenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}
