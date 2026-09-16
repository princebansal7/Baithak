import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Users, Pencil } from 'lucide-react';
import { generateId } from '../../utils/id';
import { getColorForIndex } from '../../constants/colors';

export interface Player {
  id: string;
  name: string;
  color: string;
}

const NAMES_POOL = ['Prince', 'Ujjwal', 'Prashant', 'Mona', 'Geeky', 'Radhika', 'Sangeeta', 'Orro', 'Vikrant', 'Shraddha'];

const QUICK_PRESETS = [
  NAMES_POOL,
];

const QUICK_COUNTS = [2, 4, 5, 7, 10];

interface PeopleSetupProps {
  players: Player[];
  onChange: (players: Player[]) => void;
}

const PeopleSetup: React.FC<PeopleSetupProps> = ({ players, onChange }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const addPlayer = (name?: string) => {
    const label = (name ?? input).trim();
    if (!label) return;
    const p: Player = {
      id: generateId(),
      name: label,
      color: getColorForIndex(players.length),
    };
    onChange([...players, p]);
    setInput('');
    inputRef.current?.focus();
  };

  const removePlayer = (id: string) => onChange(players.filter((p) => p.id !== id));

  const startEdit = (player: Player) => {
    setEditingId(player.id);
    setEditingValue(player.name);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const trimmed = editingValue.trim();
    if (trimmed) {
      onChange(players.map((p) => (p.id === editingId ? { ...p, name: trimmed } : p)));
    }
    setEditingId(null);
  };

  const setCount = (n: number) => {
    const shuffled = [...NAMES_POOL].sort(() => Math.random() - 0.5);
    const newPlayers: Player[] = Array.from({ length: n }, (_, i) => ({
      id: generateId(),
      name: i < NAMES_POOL.length ? shuffled[i] : `Player ${i + 1}`,
      color: getColorForIndex(i),
    }));
    onChange(newPlayers);
  };

  const loadPreset = (names: string[]) =>
    onChange(
      names.map((name, i) => ({
        id: generateId(),
        name,
        color: getColorForIndex(i),
      }))
    );

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Quick count picker */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-stone-600 dark:text-stone-400 mb-1.5">Quick set</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all
                ${players.length === n
                  ? 'bg-crimson-600 border-[var(--ink)] text-white'
                  : 'border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:border-stone-500'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Preset names */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-stone-600 dark:text-stone-400 mb-1.5">Presets</p>
        <div className="flex flex-col gap-1.5">
          {QUICK_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => loadPreset(preset)}
              className="text-left px-3 py-2 rounded-xl border-2 border-stone-300 dark:border-stone-600 hover:border-stone-500 text-xs text-stone-600 dark:text-stone-300 transition-all truncate"
            >
              {preset.join(', ')}
            </button>
          ))}
        </div>
      </div>

      {/* Add input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          placeholder="Add player name…"
          maxLength={20}
          className="flex-1 bg-white dark:bg-stone-900 border-2 border-stone-300 dark:border-stone-600 focus:border-crimson-600 rounded-xl px-3 py-2.5 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-all min-w-0"
        />
        <button
          onClick={() => addPlayer()}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-xl border-2 border-stone-900 dark:border-stone-100 flex items-center justify-center bg-crimson-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Player list */}
      <div
        className="flex-1 overflow-y-auto space-y-1.5 min-h-0"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.3) transparent' }}
      >
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-center gap-1.5">
            <Users size={24} className="text-stone-300 dark:text-stone-600" />
            <p className="text-xs text-stone-600 dark:text-stone-400">No players yet</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {players.map((player, idx) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                transition={{ duration: 0.15 }}
                className="group flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 border-transparent hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50 dark:bg-white/[0.03] transition-all"
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border-2 border-[var(--ink)]"
                  style={{ backgroundColor: player.color }}
                >
                  {player.name[0]?.toUpperCase()}
                </span>

                {editingId === player.id ? (
                  <input
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    maxLength={20}
                    className="flex-1 bg-white dark:bg-stone-900 border-2 border-crimson-600 rounded-lg px-2 py-0.5 text-sm text-stone-900 dark:text-white outline-none min-w-0"
                  />
                ) : (
                  <span
                    className="flex-1 text-sm text-stone-700 dark:text-stone-200 truncate cursor-text hover:text-stone-900 dark:hover:text-white"
                    onClick={() => startEdit(player)}
                    title="Click to rename"
                  >
                    {player.name}
                  </span>
                )}

                <span className="text-xs text-stone-600 dark:text-stone-400 font-mono">{idx + 1}</span>
                <button
                  onClick={() => startEdit(player)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-400 hover:text-crimson-600 dark:hover:text-mustard-400 hover:bg-stone-200 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Rename player"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => removePlayer(player.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={11} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default PeopleSetup;
