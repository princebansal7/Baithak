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
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white/80 dark:bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
          aria-expanded={expanded}
        >
          <Clock size={14} />
          History
          <span className="text-xs text-gray-400 dark:text-white/30 font-normal">({history.length})</span>
          <span className="ml-auto">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="px-3 py-3 text-gray-300 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
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
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.3) transparent' }}
            >
              {history.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-white/25 text-center py-4">No spins yet</p>
              ) : (
                <AnimatePresence initial={false}>
                  {[...history].reverse().map((result) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all group"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: result.choice.color }}
                      />
                      <span className="flex-1 text-xs font-medium text-gray-700 dark:text-white/70 truncate">
                        {result.choice.label}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-white/25 flex-shrink-0">
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
