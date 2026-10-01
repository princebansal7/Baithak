import React from 'react';
import { Sun, Moon, Volume2, VolumeX, Disc2, Droplets, Layers, Pencil } from 'lucide-react';
import { Theme } from '../types';

export type GameMode = 'wheel' | 'bottle' | 'fluid' | 'combo' | 'dict';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
}

const TABS: { id: GameMode; label: string }[] = [
  { id: 'dict',   label: 'Pictionary'    },
  { id: 'wheel',  label: 'Spin Wheel'    },
  { id: 'bottle', label: 'Spin Bottle'   },
  { id: 'combo',  label: 'Combo'         },
  { id: 'fluid',  label: 'Color Splash'  },
];

const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  gameMode,
  onGameModeChange,
}) => (
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
        ) : (
          <Disc2 size={16} className="text-white" />
        )}
      </div>
      <h1 className="font-display text-sm tracking-tight leading-none hidden sm:block text-stone-900 dark:text-stone-100">
        Baithak
      </h1>
    </div>

    {/* ── Game mode tabs (centre) ──────────────────────────────────────── */}
    <div
      className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-full min-w-0 glass-pill"
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
            className={`flex items-center justify-center gap-1.5 min-w-[36px] min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 whitespace-nowrap
              ${active
                ? 'glass-accent text-white'
                : 'text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10'
              }`}
          >
            {tab.id === 'wheel' ? <Disc2 size={13} />
              : tab.id === 'fluid' ? <Droplets size={13} />
              : tab.id === 'combo' ? <Layers size={13} />
              : tab.id === 'dict' ? <Pencil size={13} />
              : <span className="text-xs leading-none">🍾</span>}
            <span className="hidden md:inline">{tab.label}</span>
            <span className={`md:hidden ${active ? '' : 'hidden sm:inline'}`}>
              {tab.id === 'wheel' ? 'Wheel' : tab.id === 'fluid' ? 'Colors' : tab.id === 'combo' ? 'Combo' : tab.id === 'dict' ? 'Draw' : 'Bottle'}
            </span>
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
  </header>
);

export default Header;
