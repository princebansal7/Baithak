import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { SpinResult } from '../types';

interface StatisticsPanelProps {
  history: SpinResult[];
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ history }) => {
  const [expanded, setExpanded] = useState(false);

  const freq: Record<string, { label: string; count: number; color: string }> = {};
  for (const r of history) {
    if (!freq[r.choice.id]) {
      freq[r.choice.id] = { label: r.choice.label, count: 0, color: r.choice.color };
    }
    freq[r.choice.id].count++;
  }

  const sorted = Object.values(freq).sort((a, b) => b.count - a.count);
  const maxCount = sorted[0]?.count ?? 1;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white/80 dark:bg-white/[0.02]">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <BarChart2 size={14} />
          Statistics
          {history.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-white/30 font-normal">({history.length} spins)</span>
          )}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {sorted.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-white/25 text-center py-4">Spin the wheel to see stats</p>
              ) : (
                <div className="space-y-2.5">
                  {sorted.map((item, i) => (
                    <div key={item.label + i} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 dark:text-white/60 font-medium truncate max-w-[70%]">
                          {item.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-white/40 font-mono">
                          {item.count}×{' '}
                          <span className="text-gray-400 dark:text-white/25">
                            ({Math.round((item.count / history.length) * 100)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.count / maxCount) * 100}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatisticsPanel;
