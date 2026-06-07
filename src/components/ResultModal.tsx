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
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.5, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
              role="dialog"
              aria-modal="true"
              aria-label={`Winner: ${winner.label}`}
            >
              {/* Glow top */}
              <div
                className="absolute inset-x-0 top-0 h-1 rounded-t-3xl"
                style={{ background: `linear-gradient(90deg, ${winner.color}, transparent, ${winner.color})` }}
              />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-150"
                aria-label="Close result"
              >
                <X size={16} />
              </button>

              <div className="p-8 flex flex-col items-center text-center gap-6">
                {/* Trophy icon animation */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 500, damping: 20 }}
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${winner?.color ?? '#7c3aed'}44, ${winner?.color ?? '#7c3aed'}88)`,
                    boxShadow: `0 0 40px ${winner?.color ?? '#7c3aed'}55`,
                  }}
                >
                  <Trophy size={40} className="text-white drop-shadow-lg" />
                </motion.div>

                <div className="space-y-3">
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm font-semibold uppercase tracking-widest text-white/50"
                  >
                    The wheel chose
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                    className="px-6 py-4 rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${winner.color}33, ${winner.color}55)`,
                      border: `2px solid ${winner.color}66`,
                      boxShadow: `0 0 30px ${winner.color}44`,
                    }}
                  >
                    <h2
                      className="text-3xl font-black text-white leading-tight"
                      style={{ textShadow: `0 0 20px ${winner.color}` }}
                    >
                      {winner.label}
                    </h2>
                  </motion.div>

                  {winner.description && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.52 }}
                      className="mt-1 px-4 py-3 rounded-xl bg-white/[0.07] border border-white/10"
                    >
                      <p className="text-base text-white/90 leading-relaxed font-medium">
                        {winner.description}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Color dot */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="h-1 w-24 rounded-full"
                  style={{ background: winner.color }}
                />

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={onClose}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
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
