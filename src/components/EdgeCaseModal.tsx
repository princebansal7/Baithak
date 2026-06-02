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
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="w-full max-w-sm rounded-3xl p-6 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/70 transition-all"
          >
            <X size={14} />
          </button>

          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
              <HelpCircle size={28} className="text-yellow-400" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Too close to call!</h3>
              <p className="text-sm text-white/50 mt-1">
                The wheel stopped right between two options. Pick one:
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full mt-2">
              {[primary, adjacent].map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => onSelect(choice)}
                  className="w-full px-5 py-4 rounded-2xl font-bold text-white text-lg transition-all duration-150 hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${choice.color}88, ${choice.color})`,
                    border: `2px solid ${choice.color}66`,
                    boxShadow: `0 4px 15px ${choice.color}33`,
                  }}
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
