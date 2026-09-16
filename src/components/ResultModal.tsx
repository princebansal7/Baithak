import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { Choice } from '../types';
import Confetti from './Confetti';

interface ResultModalProps {
  winner: Choice | null;
  onClose: () => void;
}

const ResultModal: React.FC<ResultModalProps> = ({ winner, onClose }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {winner && (
        <>
          <Confetti />

          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ background: 'rgba(23,19,16,0.72)' }}
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.5, y: 40, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: 'var(--paper)',
                border: '3px solid var(--ink)',
                boxShadow: '8px 8px 0 var(--shadow-color)',
              }}
              role="dialog"
              aria-modal="true"
              aria-label={`Winner: ${winner.label}`}
            >
              {/* Marquee stripe */}
              <div
                className="h-2.5 w-full"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, ${winner.color} 0 10px, var(--ink) 10px 20px)`,
                }}
              />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-5 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center border-2 border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-all duration-150"
                aria-label="Close result"
              >
                <X size={16} />
              </button>

              <div className="p-8 pt-7 flex flex-col items-center text-center gap-5">
                {/* Trophy badge */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 500, damping: 20 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center border-[3px]"
                  style={{
                    background: winner.color,
                    borderColor: 'var(--ink)',
                  }}
                >
                  <Trophy size={38} className="text-white" strokeWidth={2.5} />
                </motion.div>

                <div className="space-y-3 w-full">
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400"
                  >
                    The wheel chose
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                    className="px-6 py-4 rounded-2xl border-[3px]"
                    style={{
                      background: winner.color,
                      borderColor: 'var(--ink)',
                    }}
                  >
                    <h2 className="font-display text-2xl text-white leading-tight break-words">
                      {winner.label}
                    </h2>
                  </motion.div>

                  {winner.description && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.52 }}
                      className="mt-1 px-4 py-3 rounded-xl border-2 border-stone-300 dark:border-stone-600"
                    >
                      <p className="text-base text-stone-700 dark:text-stone-200 leading-relaxed font-medium">
                        {winner.description}
                      </p>
                    </motion.div>
                  )}
                </div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={onClose}
                  className="text-xs text-stone-600 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                >
                  Press Esc or click outside to close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ResultModal;
