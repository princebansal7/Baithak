// Flat carnival/ticket-booth palette — warm and cool signage colors, all pass white-text contrast
export const WHEEL_COLORS = [
  '#e0472c', // crimson
  '#f2b705', // mustard
  '#1f7a6c', // deep teal
  '#2b4c7e', // navy
  '#d35400', // burnt orange
  '#27ae60', // emerald
  '#c0392b', // brick red
  '#b7950b', // dark gold
  '#145a32', // forest green
  '#1b4f72', // steel blue
  '#a04000', // rust
  '#117864', // jade teal
  '#7b241c', // maroon
  '#1a5276', // ocean blue
  '#935116', // tan brown
  '#196f3d', // pine green
  '#b03a2e', // terracotta
  '#21618c', // cobalt
  '#9a7d0a', // bronze
  '#6e2c00', // chestnut
];

export const getColorForIndex = (index: number): string =>
  WHEEL_COLORS[index % WHEEL_COLORS.length];
