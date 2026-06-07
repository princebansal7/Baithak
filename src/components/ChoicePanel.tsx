import React, { useState, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Import, Target } from 'lucide-react';
import { Choice } from '../types';
import { generateId } from '../utils/id';
import { getColorForIndex } from '../constants/colors';
import ChoiceItem from './ChoiceItem';
import BulkImportModal from './BulkImportModal';

interface ChoicePanelProps {
  choices: Choice[];
  onChange: (choices: Choice[]) => void;
}

const ChoicePanel: React.FC<ChoicePanelProps> = ({ choices, onChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addChoice = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const newChoice: Choice = {
        id: generateId(),
        label: trimmed,
        color: getColorForIndex(choices.length),
      };
      onChange([...choices, newChoice]);
    },
    [choices, onChange]
  );

  const handleAdd = () => {
    addChoice(inputValue);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd();
  };

  const updateChoice = useCallback(
    (id: string, label: string, description: string) => {
      onChange(
        choices.map((c) =>
          c.id === id ? { ...c, label, description: description || undefined } : c
        )
      );
    },
    [choices, onChange]
  );

  const deleteChoice = useCallback(
    (id: string) => {
      onChange(choices.filter((c) => c.id !== id));
    },
    [choices, onChange]
  );

  const clearAll = () => {
    onChange([]);
    setConfirmClear(false);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIdx = choices.findIndex((c) => c.id === active.id);
        const newIdx = choices.findIndex((c) => c.id === over.id);
        onChange(arrayMove(choices, oldIdx, newIdx));
      }
    },
    [choices, onChange]
  );

  const handleBulkImport = useCallback(
    (labels: string[], mode: 'append' | 'replace') => {
      const newChoices: Choice[] = labels.map((label, i) => ({
        id: generateId(),
        label,
        color: getColorForIndex(mode === 'append' ? choices.length + i : i),
      }));
      onChange(mode === 'replace' ? newChoices : [...choices, ...newChoices]);
    },
    [choices, onChange]
  );

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Choices</h2>
            <p className="text-xs text-gray-400 dark:text-white/40">
              {choices.length === 0
                ? 'No choices yet'
                : `${choices.length} choice${choices.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk import */}
            <button
              onClick={() => setShowBulk(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-gray-400 dark:text-white/40 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-150"
              title="Bulk import"
              aria-label="Bulk import choices"
            >
              <Import size={15} />
            </button>

            {/* Clear-all — shows animated confirm on click */}
            <AnimatePresence mode="wait">
              {choices.length > 0 && !confirmClear && (
                <motion.button
                  key="trash-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setConfirmClear(true)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-red-100 dark:hover:bg-red-500/20 text-gray-400 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-all duration-150"
                  title="Clear all"
                  aria-label="Clear all choices"
                >
                  <Trash2 size={15} />
                </motion.button>
              )}

              {confirmClear && (
                <motion.div
                  key="confirm-row"
                  initial={{ opacity: 0, x: 12, scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 12, scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  className="flex items-center gap-1.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 rounded-xl px-2.5 py-1.5"
                >
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                    Clear all {choices.length}?
                  </span>
                  <button
                    onClick={clearAll}
                    className="px-2 py-0.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95"
                    aria-label="Confirm clear all"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-0.5 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-600 dark:text-white/60 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                    aria-label="Cancel"
                  >
                    No
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Add input */}
        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a choice and press Enter…"
            maxLength={60}
            className="flex-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-purple-500/60 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-white/20 outline-none transition-all ring-0 focus:ring-2 focus:ring-purple-500/30 min-w-0"
            aria-label="New choice"
          />
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/30"
            aria-label="Add choice"
          >
            <Plus size={18} />
          </button>
        </div>

        {choices.length > 0 && (
          <p className="-mt-2 mb-3 text-xs text-gray-400 dark:text-white/35">
            Tip: double-click a choice (or hit the pencil) to add a description.
          </p>
        )}

        {/* Sortable list */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pr-1 min-h-0"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.3) transparent' }}
        >
          {choices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
              <Target size={28} className="text-gray-300 dark:text-white/20" />
              <p className="text-sm text-gray-400 dark:text-white/30">Add choices above or pick a preset below</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={choices.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <AnimatePresence initial={false}>
                  {choices.map((choice, index) => (
                    <motion.div
                      key={choice.id}
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.9 }}
                      transition={{ duration: 0.18 }}
                    >
                      <ChoiceItem
                        choice={choice}
                        index={index}
                        onUpdate={updateChoice}
                        onDelete={deleteChoice}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {showBulk && (
        <BulkImportModal onImport={handleBulkImport} onClose={() => setShowBulk(false)} />
      )}
    </>
  );
};

export default ChoicePanel;
