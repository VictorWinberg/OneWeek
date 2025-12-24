import { useEffect, useState } from 'react';
import type { Block, PersonId } from '../../types';
import { PERSONS } from '../../types';
import { formatBlockTime } from '../../services/calendarNormalizer';
import { formatDateFull } from '../../utils/dateUtils';
import { useCalendarStore } from '../../stores/calendarStore';
import { ResponsibilitySelector } from './ResponsibilitySelector';

interface EventDetailPanelProps {
  block: Block | null;
  onClose: () => void;
}

export function EventDetailPanel({ block, onClose }: EventDetailPanelProps) {
  const { moveBlock, deleteBlock } = useCalendarStore();
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!block) return null;

  const person = PERSONS[block.responsiblePersonId];

  const handleChangeResponsibility = async (newPersonId: PersonId) => {
    if (newPersonId === block.responsiblePersonId) return;

    setIsMoving(true);
    try {
      await moveBlock(block.id, block.calendarId, newPersonId);
    } finally {
      setIsMoving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Är du säker på att du vill ta bort detta event?')) return;

    setIsDeleting(true);
    try {
      await deleteBlock(block.id, block.calendarId);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--color-bg-secondary)] shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <header
          className="p-4 border-b border-[var(--color-bg-tertiary)]"
          style={{ borderLeftColor: person.color, borderLeftWidth: '4px' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] truncate">
                {block.title}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {formatDateFull(new Date(block.startTime))}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {formatBlockTime(block)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
              aria-label="Stäng"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current owner badge */}
          <div className="flex items-center gap-2 mt-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
              style={{
                backgroundColor: person.color,
                color: 'var(--color-bg-primary)',
              }}
            >
              {person.initial.charAt(0)}
            </div>
            <span className="text-sm text-[var(--color-text-primary)]">
              {person.name}
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Description */}
          {block.description && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Beskrivning
              </h3>
              <p className="text-[var(--color-text-primary)] whitespace-pre-wrap">
                {block.description}
              </p>
            </div>
          )}

          {/* Change Responsibility */}
          <ResponsibilitySelector
            currentPersonId={block.responsiblePersonId}
            onSelect={handleChangeResponsibility}
            disabled={isMoving}
          />

          {isMoving && (
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
              <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Flyttar event...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-[var(--color-bg-tertiary)]">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full py-2 px-4 rounded-lg bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Tar bort...' : 'Ta bort event'}
          </button>
        </footer>
      </div>
    </>
  );
}

