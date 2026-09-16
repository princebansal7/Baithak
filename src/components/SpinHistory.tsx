import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { SpinResult } from '../types';

interface SpinHistoryProps {
  history: SpinResult[];
  onClear: () => void;
}

const SpinHistory: React.FC<SpinHistoryProps> = ({ history, onClear }) => {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now.getTime() - ts) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="group flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 flex items-center gap-2 px-4 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 transition-colors"
          aria-expanded={expanded}
        >
          <Clock size={14} className="text-crimson-600 dark:text-mustard-400" />
          History
          <span className="text-xs text-stone-600 dark:text-stone-400 font-normal">({history.length})</span>
          <span className="ml-auto">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="px-3 py-3 text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-150"
            aria-label="Clear history"
            title="Clear history"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-3 pb-3 space-y-1.5 max-h-52 overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(224,71,44,0.35) transparent' }}
            >
              {history.length === 0 ? (
                <p className="text-xs text-stone-600 dark:text-stone-400 text-center py-4">No spins yet</p>
              ) : (
                <AnimatePresence initial={false}>
                  {[...history].reverse().map((result) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 border-transparent hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50 dark:bg-white/[0.03] transition-all group"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-[var(--ink)]"
                        style={{ backgroundColor: result.choice.color }}
                      />
                      <span className="flex-1 text-xs font-medium text-stone-700 dark:text-stone-200 truncate">
                        {result.choice.label}
                      </span>
                      <span className="text-xs text-stone-600 dark:text-stone-400 flex-shrink-0">
                        {formatTime(result.timestamp)}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpinHistory;
