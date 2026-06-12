import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Check, X } from 'lucide-react';
import { Choice } from '../types';

interface ChoiceItemProps {
  choice: Choice;
  index: number;
  onUpdate: (id: string, label: string, description: string) => void;
  onDelete: (id: string) => void;
}

const ChoiceItem: React.FC<ChoiceItemProps> = ({ choice, index, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(choice.label);
  const [draftDesc, setDraftDesc] = useState(choice.description ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: choice.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onUpdate(choice.id, trimmed, draftDesc.trim());
    } else {
      setDraft(choice.label);
      setDraftDesc(choice.description ?? '');
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraft(choice.label);
    setDraftDesc(choice.description ?? '');
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style as React.CSSProperties}
      className={`group flex gap-2 px-3 py-2.5 rounded-xl transition-all duration-150
        ${isEditing ? 'items-start' : 'items-center'}
        ${isDragging ? 'shadow-2xl ring-2 ring-purple-500/50' : 'hover:bg-violet-100/50 dark:hover:bg-white/5'}
        bg-violet-50/40 dark:bg-white/[0.03]
        border border-transparent hover:border-violet-200/70 dark:hover:border-white/10`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={`flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-none p-0.5 rounded ${isEditing ? 'mt-1' : ''}`}
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={15} />
      </button>

      {/* Color dot */}
      <span
        className={`flex-shrink-0 w-3 h-3 rounded-full ring-2 ring-white/20 ${isEditing ? 'mt-1.5' : ''}`}
        style={{ backgroundColor: choice.color }}
        aria-hidden="true"
      />

      {/* Index */}
      <span className={`flex-shrink-0 text-xs text-gray-500 dark:text-gray-500 w-5 text-right font-mono ${isEditing ? 'mt-1' : ''}`}>
        {index + 1}
      </span>

      {/* Label + description / edit inputs */}
      {isEditing ? (
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            maxLength={60}
            placeholder="Choice name"
            className="w-full bg-gray-100 dark:bg-white/10 rounded-lg px-3 py-1 text-sm text-gray-900 dark:text-white outline-none ring-2 ring-purple-500/60 min-w-0"
            aria-label={`Edit choice ${index + 1}`}
          />
          <input
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            maxLength={140}
            placeholder="Description (optional) — shown when this choice wins"
            className="w-full bg-gray-100 dark:bg-white/10 rounded-lg px-3 py-1 text-xs text-gray-600 dark:text-white/70 outline-none ring-1 ring-gray-300 dark:ring-white/15 focus:ring-2 focus:ring-purple-500/50 min-w-0"
            aria-label={`Edit description for choice ${index + 1}`}
          />
        </div>
      ) : (
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onDoubleClick={() => setIsEditing(true)}
        >
          <span
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 truncate"
            title={choice.label}
          >
            {choice.label}
          </span>
          {choice.description && (
            <span
              className="block text-xs text-gray-400 dark:text-white/45 truncate"
              title={choice.description}
            >
              {choice.description}
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className={`flex-shrink-0 flex items-center gap-1 ${isEditing ? 'mt-0.5' : ''}`}>
        {isEditing ? (
          <>
            <button
              onClick={commitEdit}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-green-500 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 transition-all"
              aria-label="Save"
            >
              <Check size={13} />
            </button>
            <button
              onClick={cancelEdit}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
              aria-label="Cancel"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-all duration-150"
              aria-label={`Edit ${choice.label}`}
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(choice.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all duration-150"
              aria-label={`Delete ${choice.label}`}
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChoiceItem;
