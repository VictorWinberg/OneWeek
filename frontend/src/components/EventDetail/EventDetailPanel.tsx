import { useEffect, useState } from 'react';
import { rrulestr } from 'rrule';
import type { Block } from '@/types';
import { getInitial } from '@/types';
import { formatBlockTime } from '@/services/calendarNormalizer';
import { formatDateFull } from '@/utils/dateUtils';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { useMoveEvent, useDeleteEvent, useUpdateEvent } from '@/hooks/useCalendarQueries';
import { ResponsibilitySelector } from './ResponsibilitySelector';
import { RecurrenceSelector } from './RecurrenceSelector';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RecurringUpdateDialog, type RecurringUpdateMode } from './RecurringUpdateDialog';
import type { RecurrenceRule } from '@/types/block';
import { eventsApi } from '@/services/api';

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

  if (ruleMap['COUNT']) {
    description += `, ${ruleMap['COUNT']} gånger`;
  } else if (ruleMap['UNTIL']) {
    // Parse RRULE date format: YYYYMMDDTHHMMSSZ
    const untilStr = ruleMap['UNTIL'];
    let until: Date;

    if (untilStr.includes('T')) {
      // Format: YYYYMMDDTHHMMSSZ
      const year = parseInt(untilStr.substring(0, 4));
      const month = parseInt(untilStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(untilStr.substring(6, 8));
      until = new Date(Date.UTC(year, month, day));
    } else {
      // Format: YYYYMMDD
      const year = parseInt(untilStr.substring(0, 4));
      const month = parseInt(untilStr.substring(4, 6)) - 1;
      const day = parseInt(untilStr.substring(6, 8));
      until = new Date(Date.UTC(year, month, day));
    }

    description += `, till ${new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short' }).format(until)}`;
  }

  return description;
}

function parseRecurrence(recurrenceRules?: string[]): RecurrenceRule | null {
  if (!recurrenceRules || recurrenceRules.length === 0) return null;

  const rruleLine = recurrenceRules.find((rule) => rule.startsWith('RRULE:'));
  if (!rruleLine) return null;

  try {
    const rRule = rrulestr(rruleLine);
    const options = rRule.options;

    const frequencyMap: Record<number, RecurrenceRule['frequency']> = {
      0: 'YEARLY',
      1: 'MONTHLY',
      2: 'WEEKLY',
      3: 'DAILY',
    };

    const rule: RecurrenceRule = {
      frequency: frequencyMap[options.freq] || 'DAILY',
      interval: options.interval || 1,
    };

    if (options.count !== null) {
      rule.count = options.count;
    }

    if (options.until) {
      rule.until = options.until;
    }

    if (options.byweekday && options.byweekday.length > 0) {
      const weekdayMap: Record<number, string> = {
        0: 'MO',
        1: 'TU',
        2: 'WE',
        3: 'TH',
        4: 'FR',
        5: 'SA',
        6: 'SU',
      };
      rule.byDay = options.byweekday.map((wd: any) => {
        const weekdayNum = typeof wd === 'number' ? wd : wd.weekday;
        return weekdayMap[weekdayNum];
      }) as RecurrenceRule['byDay'];
    }

    return rule;
  } catch (error) {
    console.error('Failed to parse recurrence rule:', error);
    return null;
  }
}

interface EventDetailPanelProps {
  block: Block | null;
  onClose: () => void;
}

export function EventDetailPanel({ block, onClose }: EventDetailPanelProps) {
  const { selectBlock } = useCalendarStore();
  const { getPersonById } = useConfigStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRecurringUpdateDialog, setShowRecurringUpdateDialog] = useState(false);
  const [showRecurringDeleteDialog, setShowRecurringDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [masterRecurrence, setMasterRecurrence] = useState<string[] | undefined>(undefined);

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editEndDate, setEditEndDate] = useState(new Date());
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('10:00');
  const [editAllDay, setEditAllDay] = useState(false);
  const [editRecurrenceRule, setEditRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [error, setError] = useState<string | null>(null);

  const moveEvent = useMoveEvent();
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();

  useEffect(() => {
    if (block?.recurringEventId && !block.recurrence) {
      eventsApi
        .getEvent(block.calendarId, block.recurringEventId)
        .then((masterEvent) => {
          setMasterRecurrence(masterEvent.recurrence);
        })
        .catch((err) => {
          console.error('Failed to fetch master recurring event:', err);
          setMasterRecurrence(undefined);
        });
    } else {
      setMasterRecurrence(undefined);
    }
  }, [block?.id, block?.recurringEventId]);

  useEffect(() => {
    setIsEditing(false);
    setError(null);
  }, [block?.id]);

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
  const recurrenceRules = block.recurrence || masterRecurrence;
  const recurrenceDescription = formatRecurrence(recurrenceRules);

  const handleChangeResponsibility = async (newCalendarId: string) => {
    if (newCalendarId === block.calendarId) return;

    try {
      const result = await moveEvent.mutateAsync({
        blockId: block.id,
        calendarId: block.calendarId,
        targetCalendarId: newCalendarId,
        startTime: block.startTime,
      });
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
    if (block.recurringEventId || block.recurrence) {
      setShowRecurringDeleteDialog(true);
    } else {
      setShowDeleteConfirm(true);
    }
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

  const performDelete = async (mode: RecurringUpdateMode) => {
    try {
      let eventIdToDelete = block.id;

      if (mode === 'this') {
        eventIdToDelete = block.id;
      } else if (mode === 'all') {
        eventIdToDelete = block.recurringEventId || block.id;
      } else if (mode === 'future') {
        eventIdToDelete = block.id;
      }

      await deleteEvent.mutateAsync({
        blockId: eventIdToDelete,
        calendarId: block.calendarId,
        startTime: block.startTime,
        updateMode: mode,
      });

      setShowRecurringDeleteDialog(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete event:', error);
      setShowRecurringDeleteDialog(false);
    }
  };

  const handleEditToggle = () => {
    if (!isEditing && block) {
      setEditTitle(block.title);
      setEditDescription(block.description || '');

      const startDateTime = new Date(block.startTime);
      const endDateTime = new Date(block.endTime);

      setEditStartDate(startDateTime);
      setEditEndDate(endDateTime);
      setEditAllDay(block.allDay);

      setEditStartTime(
        `${startDateTime.getHours().toString().padStart(2, '0')}:${startDateTime
          .getMinutes()
          .toString()
          .padStart(2, '0')}`
      );
      setEditEndTime(
        `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`
      );

      const recurrenceToUse = block.recurrence || masterRecurrence;
      setEditRecurrenceRule(parseRecurrence(recurrenceToUse));
    }
    setIsEditing(!isEditing);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      setError('Titel krävs');
      return;
    }

    const startDateTime = new Date(editStartDate);
    const endDateTime = new Date(editEndDate);

    if (!editAllDay) {
      const [startHour, startMinute] = editStartTime.split(':').map(Number);
      const [endHour, endMinute] = editEndTime.split(':').map(Number);

      startDateTime.setHours(startHour, startMinute, 0, 0);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      if (endDateTime <= startDateTime) {
        setError('Sluttid måste vara efter starttid');
        return;
      }
    } else {
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime.setHours(23, 59, 59, 999);
    }

    if (block.recurringEventId || block.recurrence) {
      setShowRecurringUpdateDialog(true);
    } else {
      await performUpdate('this');
    }
  };

  const performUpdate = async (mode: RecurringUpdateMode) => {
    try {
      const startDateTime = new Date(editStartDate);
      const endDateTime = new Date(editEndDate);

      if (!editAllDay) {
        const [startHour, startMinute] = editStartTime.split(':').map(Number);
        const [endHour, endMinute] = editEndTime.split(':').map(Number);

        startDateTime.setHours(startHour, startMinute, 0, 0);
        endDateTime.setHours(endHour, endMinute, 0, 0);
      } else {
        startDateTime.setHours(0, 0, 0, 0);
        endDateTime.setHours(23, 59, 59, 999);
      }

      let eventIdToUpdate = block.id;
      let shouldClosePanel = false;

      if (mode === 'this') {
        eventIdToUpdate = block.id;
      } else if (mode === 'all' || mode === 'future') {
        eventIdToUpdate = block.recurringEventId || block.id;
        shouldClosePanel = true;
      }

      await updateEvent.mutateAsync({
        blockId: eventIdToUpdate,
        calendarId: block.calendarId,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        recurrenceRule: mode === 'this' && block.recurringEventId ? undefined : editRecurrenceRule,
        updateMode: mode,
      });

      if (shouldClosePanel) {
        onClose();
      } else {
        selectBlock({
          ...block,
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          startTime: startDateTime,
          endTime: endDateTime,
        });

        setIsEditing(false);
        setError(null);
      }

      setShowRecurringUpdateDialog(false);
    } catch (err) {
      setError('Kunde inte uppdatera event');
      console.error('Failed to update event:', err);
      setShowRecurringUpdateDialog(false);
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

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Startdatum *
                  </label>
                  <input
                    type="date"
                    value={new Intl.DateTimeFormat('sv-SE').format(editStartDate)}
                    onChange={(e) => {
                      const newStartDate = new Date(e.target.value + 'T12:00:00');
                      setEditStartDate(newStartDate);
                      // If end date is before start date, update it
                      if (editEndDate < newStartDate) {
                        setEditEndDate(newStartDate);
                      }
                    }}
                    className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Slutdatum *
                  </label>
                  <input
                    type="date"
                    value={new Intl.DateTimeFormat('sv-SE').format(editEndDate)}
                    onChange={(e) => setEditEndDate(new Date(e.target.value + 'T12:00:00'))}
                    min={new Intl.DateTimeFormat('sv-SE').format(editStartDate)}
                    className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </div>
              </div>

              {/* All Day Toggle */}
              <div className="flex items-center gap-2">
                <input
                  id="editAllDay"
                  type="checkbox"
                  checked={editAllDay}
                  onChange={(e) => setEditAllDay(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--color-bg-tertiary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <label htmlFor="editAllDay" className="text-sm text-[var(--color-text-primary)]">
                  Heldag
                </label>
              </div>

              {/* Time Selection */}
              {!editAllDay && (
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
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                      Sluttid *
                    </label>
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Recurrence */}
              {(recurrenceDescription || block.recurringEventId) && (
                <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-300">
                        {block.recurringEventId
                          ? 'Denna händelse är del av en återkommande serie'
                          : 'Detta är en återkommande händelse'}
                      </p>
                      {recurrenceDescription && (
                        <p className="text-sm text-blue-200/80 mt-1">{recurrenceDescription}</p>
                      )}
                      <p className="text-xs text-blue-200/60 mt-2">
                        Ändringar av återkommande regler påverkar hela serien och alla framtida instanser.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <RecurrenceSelector
                value={editRecurrenceRule}
                onChange={setEditRecurrenceRule}
                disabled={updateEvent.isPending}
              />

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-200 text-sm">{error}</div>
              )}
            </>
          ) : (
            <>
              {/* View Mode */}
              {/* Recurrence Info */}
              {(recurrenceDescription || block.recurringEventId) && (
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
                      {recurrenceDescription ? (
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{recurrenceDescription}</p>
                      ) : (
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Del av en återkommande serie</p>
                      )}
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

      {/* Recurring Update Dialog */}
      <RecurringUpdateDialog
        isOpen={showRecurringUpdateDialog}
        onClose={() => setShowRecurringUpdateDialog(false)}
        onConfirm={performUpdate}
        isLoading={updateEvent.isPending}
      />

      {/* Recurring Delete Dialog */}
      <RecurringUpdateDialog
        isOpen={showRecurringDeleteDialog}
        onClose={() => setShowRecurringDeleteDialog(false)}
        onConfirm={performDelete}
        isLoading={deleteEvent.isPending}
      />
    </>
  );
}
