import React from 'react';
import { Sun, Moon, Volume2, VolumeX, Disc2 } from 'lucide-react';
import { Theme } from '../types';

export type GameMode = 'wheel' | 'bottle';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
}

const TABS: { id: GameMode; label: string }[] = [
  { id: 'wheel',  label: 'Spin Wheel'  },
  { id: 'bottle', label: 'Spin Bottle' },
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
    className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-3 md:px-6"
    style={{
      background:
        theme === 'dark' ? 'rgba(10,10,26,0.88)' : 'rgba(255,255,255,0.90)',
      backdropFilter: 'blur(20px)',
      borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.07)',
    }}
  >
    {/* ── Logo ────────────────────────────────────────────────────────── */}
    <div className="flex items-center gap-2 flex-shrink-0">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          boxShadow: '0 2px 12px rgba(124,58,237,0.4)',
        }}
      >
        {gameMode === 'bottle' ? (
          <span className="text-sm">🍾</span>
        ) : (
          <Disc2 size={16} className="text-white" />
        )}
      </div>
      <h1 className="text-sm font-black tracking-tight leading-none hidden sm:block text-gray-900 dark:text-white">
        Baithak
      </h1>
    </div>

    {/* ── Game mode tabs (centre) ──────────────────────────────────────── */}
    <div
      className="flex items-center gap-1 p-1 rounded-2xl"
      style={{
        background:
          theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      }}
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
            onClick={() => onGameModeChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap
              ${active
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                : 'text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
          >
            {tab.id === 'wheel' ? <Disc2 size={13} /> : <span className="text-xs leading-none">🍾</span>}
            <span className="hidden md:inline">{tab.label}</span>
            <span className="md:hidden">
              {tab.id === 'wheel' ? 'Wheel' : 'Bottle'}
            </span>
          </button>
        );
      })}
    </div>

    {/* ── Controls ────────────────────────────────────────────────────── */}
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button
        onClick={onToggleSound}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95
          ${soundEnabled
            ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/30'
            : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-white/60'
          }`}
        aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        title={soundEnabled ? 'Mute' : 'Unmute'}
      >
        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        <span className="hidden sm:inline">{soundEnabled ? 'On' : 'Off'}</span>
      </button>

      <button
        onClick={onToggleTheme}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-800 dark:hover:text-white/80 transition-all duration-150 hover:scale-105 active:scale-95"
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
