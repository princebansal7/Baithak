import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sun, Moon, Volume2, VolumeX, Disc2, Droplets, Layers, Pencil, Sparkles, ChevronDown, Check } from 'lucide-react';
import { Theme } from '../types';

export type GameMode = 'wheel' | 'bottle' | 'fluid' | 'combo' | 'dict' | 'fireworks';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
}

const TABS: { id: GameMode; label: string; hint: string }[] = [
  { id: 'dict',      label: 'Pictionary',   hint: 'Draw it, guess it'          },
  { id: 'wheel',     label: 'Spin Wheel',   hint: 'Let the wheel decide'       },
  { id: 'bottle',    label: 'Spin Bottle',  hint: 'Who is up next?'            },
  { id: 'combo',     label: 'Combo',        hint: 'Bottle + wheel challenge'   },
  { id: 'fluid',     label: 'Color Splash', hint: 'Paint with living fluid'    },
  { id: 'fireworks', label: 'Fireworks',    hint: 'Light up the night sky'     },
];

const GameIcon: React.FC<{ id: GameMode; size: number }> = ({ id, size }) =>
  id === 'wheel' ? <Disc2 size={size} />
    : id === 'fluid' ? <Droplets size={size} />
    : id === 'combo' ? <Layers size={size} />
    : id === 'dict' ? <Pencil size={size} />
    : id === 'fireworks' ? <Sparkles size={size} />
    : <span style={{ fontSize: size - 1, lineHeight: 1 }}>🍾</span>;

const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  gameMode,
  onGameModeChange,
}) => {
  // Below `lg` the game tabs collapse into one switcher that opens a menu.
  const [menuOpen, setMenuOpen] = useState(false);
  const current = TABS.find((t) => t.id === gameMode) ?? TABS[0];

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
  <>
  {/* Dimmed backdrop: tap anywhere outside the menu to close it */}
  <AnimatePresence>
    {menuOpen && (
      <motion.button
        aria-hidden
        tabIndex={-1}
        onClick={() => setMenuOpen(false)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-20 lg:hidden cursor-default bg-black/25 backdrop-blur-[2px]"
      />
    )}
  </AnimatePresence>
  <header
    className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between gap-2 px-2 sm:px-3 md:px-6 pointer-events-none [&>*]:pointer-events-auto"
  >
    {/* ── Logo ────────────────────────────────────────────────────────── */}
    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-base glass-accent"
      >
        {gameMode === 'bottle' ? (
          <span className="text-sm">🍾</span>
        ) : gameMode === 'fluid' ? (
          <Droplets size={16} className="text-white" />
        ) : gameMode === 'combo' ? (
          <Layers size={16} className="text-white" />
        ) : gameMode === 'dict' ? (
          <Pencil size={16} className="text-white" />
        ) : gameMode === 'fireworks' ? (
          <Sparkles size={16} className="text-white" />
        ) : (
          <Disc2 size={16} className="text-white" />
        )}
      </div>
      <h1 className="font-display text-sm tracking-tight leading-none hidden sm:block text-stone-900 dark:text-stone-100">
        Baithak
      </h1>
    </div>

    {/* ── Collapsed game switcher (below lg) ───────────────────────────── */}
    <div className="lg:hidden min-w-0 p-1 rounded-full glass-pill">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls="game-menu"
        aria-label={`Game: ${current.label}. Open game menu`}
        className="flex items-center gap-2 max-w-full min-h-[36px] pl-3 pr-2.5 rounded-full text-xs font-bold glass-accent text-white transition-all duration-150 active:scale-95"
      >
        <GameIcon id={gameMode} size={14} />
        <span className="truncate">{current.label}</span>
        <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
      </button>
    </div>

    {/* ── Game mode tabs (centre, lg and up) ───────────────────────────── */}
    <div
      className="hidden lg:flex items-center gap-1 p-1 rounded-full min-w-0 glass-pill"
      role="tablist"
      aria-label="Game mode"
    >
      {TABS.map((tab) => {
        const active = gameMode === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            aria-label={tab.label}
            onClick={() => onGameModeChange(tab.id)}
            className={`flex items-center justify-center gap-1.5 min-w-[36px] min-h-[36px] px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 whitespace-nowrap
              ${active
                ? 'glass-accent text-white'
                : 'text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10'
              }`}
          >
            <GameIcon id={tab.id} size={13} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>

    {/* ── Controls ────────────────────────────────────────────────────── */}
    <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
      <button
        onClick={onToggleSound}
        className={`flex items-center justify-center gap-1 min-w-[40px] min-h-[40px] px-2.5 py-1.5 rounded-full text-xs font-bold glass-btn transition-all duration-150 active:scale-95
          ${soundEnabled ? 'text-crimson-700 dark:text-crimson-300' : 'text-stone-600 dark:text-stone-300'}`}
        aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        title={soundEnabled ? 'Mute' : 'Unmute'}
      >
        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        <span className="hidden sm:inline">{soundEnabled ? 'On' : 'Off'}</span>
      </button>

      <button
        onClick={onToggleTheme}
        className="flex items-center justify-center gap-1 min-w-[40px] min-h-[40px] px-2.5 py-1.5 rounded-full text-xs font-bold glass-btn text-stone-800 dark:text-stone-100 transition-all duration-150 active:scale-95"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
    </div>

    {/* ── Game menu panel (below lg) ───────────────────────────────────── */}
    <div className="absolute top-full left-0 right-0 mt-2 px-2 sm:px-3 flex justify-start sm:justify-center lg:hidden !pointer-events-none">
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="game-menu"
            role="menu"
            aria-label="Choose a game"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ transformOrigin: 'top center' }}
            className="pointer-events-auto glass-card p-2 flex flex-col gap-1 w-[min(100%,22rem)]"
          >
            {TABS.map((tab, i) => {
              const active = gameMode === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => { onGameModeChange(tab.id); setMenuOpen(false); }}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 + i * 0.03, duration: 0.18 }}
                  className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-2xl text-left transition-colors duration-150 active:scale-[0.98]
                    ${active
                      ? 'glass-accent text-white'
                      : 'text-stone-800 dark:text-stone-100 hover:bg-white/40 dark:hover:bg-white/10'}`}
                >
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/20' : 'glass-btn'}`}>
                    <GameIcon id={tab.id} size={16} />
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-bold leading-tight">{tab.label}</span>
                    <span className={`text-[11px] leading-tight ${active ? 'text-white/80' : 'text-stone-600 dark:text-stone-400'}`}>{tab.hint}</span>
                  </span>
                  {active && <Check size={16} className="ml-auto flex-shrink-0" />}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </header>
  </>
  );
};

export default Header;
