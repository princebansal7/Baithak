import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Import, AlertCircle } from 'lucide-react';

interface BulkImportModalProps {
  onImport: (labels: string[]) => void;
  onClose: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onImport, onClose }) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('append');

  const parsed = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const handleImport = () => {
    if (parsed.length === 0) return;
    onImport(parsed);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Bulk import choices"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Import size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Bulk Import</h3>
                <p className="text-xs text-white/40">One choice per line</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
            >
              <X size={14} />
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Apple\nBanana\nOrange\nMango\n\nOne entry per line…"}
            className="w-full h-44 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-white/20 resize-none outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono"
            aria-label="Paste choices, one per line"
          />

          <div className="flex items-center gap-2 mt-3">
            {parsed.length > 0 ? (
              <span className="text-xs text-green-400 flex items-center gap-1">
                ✓ {parsed.length} choice{parsed.length !== 1 ? 's' : ''} detected
              </span>
            ) : text.length > 0 ? (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <AlertCircle size={12} /> No valid lines found
              </span>
            ) : null}
          </div>

          {/* Mode selector */}
          <div className="flex gap-2 mt-4">
            {(['append', 'replace'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                  mode === m
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                {m === 'append' ? '+ Append' : '⟳ Replace All'}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-semibold text-sm transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={parsed.length === 0}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Import {parsed.length > 0 ? `(${parsed.length})` : ''}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BulkImportModal;
