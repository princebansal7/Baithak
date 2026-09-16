import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import { Choice } from '../types';

interface EdgeCaseModalProps {
  primary: Choice | null;
  adjacent: Choice | null;
  onSelect: (choice: Choice) => void;
  onClose: () => void;
}

const EdgeCaseModal: React.FC<EdgeCaseModalProps> = ({ primary, adjacent, onSelect, onClose }) => {
  if (!primary || !adjacent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(23,19,16,0.72)' }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative w-full max-w-sm rounded-3xl p-6"
          style={{
            background: 'var(--paper)',
            border: '3px solid var(--ink)',
            boxShadow: '8px 8px 0 var(--shadow-color)',
          }}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center border-2 border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-all"
          >
            <X size={14} />
          </button>

          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-mustard-400 border-[3px] border-[var(--ink)] flex items-center justify-center">
              <HelpCircle size={28} className="text-stone-900" strokeWidth={2.5} />
            </div>

            <div>
              <h3 className="font-display text-lg text-stone-900 dark:text-white">Too close to call!</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                The wheel stopped right between two options. Pick one:
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full mt-2">
              {[primary, adjacent].map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => onSelect(choice)}
                  className="w-full px-5 py-4 rounded-2xl font-bold text-white text-lg border-[3px] border-[var(--ink)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: choice.color }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EdgeCaseModal;
