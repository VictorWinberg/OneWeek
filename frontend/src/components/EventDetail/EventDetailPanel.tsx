import { useEffect, useState } from 'react';
import type { Block } from '@/types';
import { getInitial } from '@/types';
import { formatBlockTime } from '@/services/calendarNormalizer';
import { formatDateFull } from '@/utils/dateUtils';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { useMoveEvent, useDeleteEvent, useUpdateEvent } from '@/hooks/useCalendarQueries';
import { ResponsibilitySelector } from './ResponsibilitySelector';
import { ConfirmDialog } from '@/components/ConfirmDialog';

// Helper to format recurrence rules for display
function formatRecurrence(recurrenceRules?: string[]): string | null {
  if (!recurrenceRules || recurrenceRules.length === 0) return null;

  const rrule = recurrenceRules.find((rule) => rule.startsWith('RRULE:'));
  if (!rrule) return null;

  const parts = rrule.replace('RRULE:', '').split(';');
  const ruleMap: Record<string, string> = {};
  parts.forEach((part) => {
    const [key, value] = part.split('=');
    ruleMap[key] = value;
  });

  let description = '';

  // Frequency
  const freq = ruleMap['FREQ'];
  const interval = ruleMap['INTERVAL'] || '1';
  const intervalNum = parseInt(interval);

  if (freq === 'DAILY') {
    description = intervalNum === 1 ? 'Varje dag' : `Var ${intervalNum}:e dag`;
  } else if (freq === 'WEEKLY') {
    description = intervalNum === 1 ? 'Varje vecka' : `Var ${intervalNum}:e vecka`;
    if (ruleMap['BYDAY']) {
      const days = ruleMap['BYDAY'].split(',');
      const dayNames: Record<string, string> = {
        MO: 'mån',
        TU: 'tis',
        WE: 'ons',
        TH: 'tor',
        FR: 'fre',
        SA: 'lör',
        SU: 'sön',
      };
      const formattedDays = days.map((d) => dayNames[d] || d).join(', ');
      description += ` på ${formattedDays}`;
    }
  } else if (freq === 'MONTHLY') {
    description = intervalNum === 1 ? 'Varje månad' : `Var ${intervalNum}:e månad`;
  } else if (freq === 'YEARLY') {
    description = intervalNum === 1 ? 'Varje år' : `Var ${intervalNum}:e år`;
  }

  // End condition
  if (ruleMap['COUNT']) {
    description += `, ${ruleMap['COUNT']} gånger`;
  } else if (ruleMap['UNTIL']) {
    const until = new Date(ruleMap['UNTIL']);
    description += `, till ${new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short' }).format(until)}`;
  }

  return description;
}

interface EventDetailPanelProps {
  block: Block | null;
  onClose: () => void;
}

export function EventDetailPanel({ block, onClose }: EventDetailPanelProps) {
  const { selectBlock } = useCalendarStore();
  const { getPersonById } = useConfigStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('10:00');
  const [error, setError] = useState<string | null>(null);

  const moveEvent = useMoveEvent();
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
          setError(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, isEditing]);

  if (!block) return null;

  const person = getPersonById(block.calendarId);
  if (!person) return null;

  const initial = getInitial(person.name);
  const recurrenceDescription = formatRecurrence(block.recurrence);

  const handleChangeResponsibility = async (newCalendarId: string) => {
    if (newCalendarId === block.calendarId) return;

    try {
      const result = await moveEvent.mutateAsync({
        blockId: block.id,
        calendarId: block.calendarId,
        targetCalendarId: newCalendarId,
        startTime: block.startTime,
      });
      // Update selected block with new calendar ID and new event ID from the move
      selectBlock({
        ...block,
        id: result.newEventId,
        calendarId: newCalendarId,
      });
    } catch (error) {
      console.error('Failed to move event:', error);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteEvent.mutateAsync({
        blockId: block.id,
        calendarId: block.calendarId,
        startTime: block.startTime,
      });
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleEditToggle = () => {
    if (!isEditing && block) {
      // Initialize form with current block data when entering edit mode
      setEditTitle(block.title);
      setEditDescription(block.description || '');
      setEditDate(new Date(block.startTime));

      const startDate = new Date(block.startTime);
      const endDate = new Date(block.endTime);
      setEditStartTime(
        `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`
      );
      setEditEndTime(
        `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
      );
    }
    setIsEditing(!isEditing);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      setError('Titel krävs');
      return;
    }

    try {
      // Combine date with time
      const startDateTime = new Date(editDate);
      const endDateTime = new Date(editDate);

      const [startHour, startMinute] = editStartTime.split(':').map(Number);
      const [endHour, endMinute] = editEndTime.split(':').map(Number);

      startDateTime.setHours(startHour, startMinute, 0, 0);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      // Validate times
      if (endDateTime <= startDateTime) {
        setError('Sluttid måste vara efter starttid');
        return;
      }

      await updateEvent.mutateAsync({
        blockId: block.id,
        calendarId: block.calendarId,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
      });

      // Update selected block with new data
      selectBlock({
        ...block,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
      });

      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError('Kunde inte uppdatera event');
      console.error('Failed to update event:', err);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--color-bg-secondary)] shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <header
          className="p-4 border-b border-[var(--color-bg-tertiary)]"
          style={{ borderLeftColor: person.color, borderLeftWidth: '4px' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Titel"
                  className="w-full text-xl font-bold bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg px-3 py-2 border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              ) : (
                <>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)] truncate">{block.title}</h2>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {formatDateFull(new Date(block.startTime))}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{formatBlockTime(block)}</p>
                </>
              )}
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
              {initial.charAt(0)}
            </div>
            <span className="text-sm text-[var(--color-text-primary)]">{person.name}</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isEditing ? (
            <>
              {/* Edit Form */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Beskrivning</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Valfri beskrivning..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
                />
              </div>

              {/* Change Responsibility */}
              <ResponsibilitySelector
                currentCalendarId={block.calendarId}
                onSelect={handleChangeResponsibility}
                disabled={moveEvent.isPending}
              />

              {moveEvent.isPending && (
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Flyttar event...</span>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Datum *</label>
                <input
                  type="date"
                  value={new Intl.DateTimeFormat('sv-SE').format(editDate)}
                  onChange={(e) => setEditDate(new Date(e.target.value + 'T12:00:00'))}
                  className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Starttid *
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sluttid *</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-200 text-sm">{error}</div>
              )}
            </>
          ) : (
            <>
              {/* View Mode */}
              {/* Recurrence Info */}
              {recurrenceDescription && (
                <div className="p-3 bg-[var(--color-bg-tertiary)] rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-[var(--color-accent)] mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">Återkommande händelse</p>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">{recurrenceDescription}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {block.description && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Beskrivning</h3>
                  <p className="text-[var(--color-text-primary)] whitespace-pre-wrap">{block.description}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-[var(--color-bg-tertiary)] space-y-2">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={handleEditToggle}
                disabled={updateEvent.isPending}
                className="flex-1 py-2 px-4 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors disabled:opacity-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateEvent.isPending || !editTitle.trim()}
                className="flex-1 py-2 px-4 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
              >
                {updateEvent.isPending ? 'Sparar...' : 'Spara'}
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleEditToggle}
                className="w-full py-2 px-4 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Redigera event
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={deleteEvent.isPending}
                className="w-full py-2 px-4 rounded-lg bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors disabled:opacity-50"
              >
                Ta bort event
              </button>
            </>
          )}
        </footer>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Ta bort event?"
        description={`Är du säker på att du vill ta bort "${block.title}"? Detta kan inte ångras.`}
        confirmText="Ta bort"
        cancelText="Avbryt"
        isDangerous={true}
        isLoading={deleteEvent.isPending}
      />
    </>
  );
}
