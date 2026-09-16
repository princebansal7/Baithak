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
        {/* Input + actions row */}
        <div className="flex gap-2 items-center mb-4">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a choice and press Enter…"
            maxLength={60}
            className="flex-1 bg-white dark:bg-stone-900 border-2 border-stone-300 dark:border-stone-600 focus:border-crimson-600 rounded-xl px-4 py-2.5 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-all min-w-0"
            aria-label="New choice"
          />

          {/* Bulk import */}
          <button
            onClick={() => setShowBulk(true)}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border-2 border-stone-300 dark:border-stone-600 hover:border-crimson-600 text-stone-600 dark:text-stone-400 hover:text-crimson-600 dark:hover:text-mustard-400 transition-all duration-150"
            title="Bulk import"
            aria-label="Bulk import choices"
          >
            <Import size={15} />
          </button>

          {/* Clear-all */}
          <AnimatePresence mode="wait">
            {choices.length > 0 && !confirmClear && (
              <motion.button
                key="trash-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => setConfirmClear(true)}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border-2 border-stone-300 dark:border-stone-600 hover:border-red-500 text-stone-600 dark:text-stone-400 hover:text-red-500 transition-all duration-150"
                title="Clear all"
                aria-label="Clear all choices"
              >
                <Trash2 size={15} />
              </motion.button>
            )}
            {confirmClear && (
              <motion.div
                key="confirm-row"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                className="flex-shrink-0 flex items-center gap-1 bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-xl px-2 py-1.5"
              >
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                  Clear {choices.length}?
                </span>
                <button
                  onClick={clearAll}
                  className="px-1.5 py-0.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all"
                  aria-label="Confirm clear all"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-1.5 py-0.5 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 text-xs font-semibold transition-all"
                  aria-label="Cancel"
                >
                  No
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add */}
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="flex-shrink-0 w-9 h-9 rounded-xl border-2 border-stone-900 dark:border-stone-100 flex items-center justify-center bg-crimson-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
            aria-label="Add choice"
          >
            <Plus size={18} />
          </button>
        </div>

        {choices.length > 0 && (
          <p className="-mt-2 mb-3 text-xs text-stone-600 dark:text-stone-400">
            Tip: double-click a choice (or hit the pencil) to add a description.
          </p>
        )}

        {/* Sortable list */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pr-1 min-h-0"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(224,71,44,0.35) transparent' }}
        >
          {choices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
              <Target size={28} className="text-stone-300 dark:text-stone-600" />
              <p className="text-sm text-stone-600 dark:text-stone-400">Add choices above or pick a preset below</p>
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
