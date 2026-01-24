import { useEffect, useState } from 'react';
import { rrulestr } from 'rrule';
import type { Block } from '@/types';
import { getInitial } from '@/types';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { useMoveEvent, useDeleteEvent, useUpdateEvent } from '@/hooks/useCalendarQueries';
import { ResponsibilitySelector } from '@/components/EventDetail/ResponsibilitySelector';
import { RecurrenceSelector } from '@/components/EventDetail/RecurrenceSelector';
import { DateTimeFields } from '@/components/EventDetail/DateTimeFields';
import { EventPanelLayout } from '@/components/EventDetail/EventPanelLayout';
import { EventFormFields } from '@/components/EventDetail/EventFormFields';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RecurringUpdateDialog, type RecurringUpdateMode } from '@/components/EventDetail/RecurringUpdateDialog';
import { createAllDayDateRange, createTimedDateRange } from '@/utils/eventFormUtils';
import type { RecurrenceRule } from '@/types/block';
import { eventsApi } from '@/services/api';
import CloseIcon from '@/assets/icons/close.svg?react';
import InfoIcon from '@/assets/icons/info.svg?react';

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
      rule.byDay = options.byweekday.map((wd: number | { weekday: number }) => {
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
  }, [block?.id, block?.recurringEventId, block?.calendarId, block?.recurrence]);

  useEffect(() => {
    if (block) {
      // Initialize form fields from block data when block changes
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
    setError(null);
  }, [block, masterRecurrence]);

  useEscapeKey(onClose);

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

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      setError('Titel krävs');
      return;
    }

    if (!editAllDay) {
      const result = createTimedDateRange(editStartDate, editEndDate, editStartTime, editEndTime);
      if (result.validationError) {
        setError(result.validationError);
        return;
      }
    }

    if (block.recurringEventId || block.recurrence) {
      setShowRecurringUpdateDialog(true);
    } else {
      await performUpdate('this');
    }
  };

  const performUpdate = async (mode: RecurringUpdateMode) => {
    try {
      let startDateTime: Date;
      let endDateTime: Date;

      if (!editAllDay) {
        const result = createTimedDateRange(editStartDate, editEndDate, editStartTime, editEndTime);
        startDateTime = result.startDateTime;
        endDateTime = result.endDateTime;
      } else {
        const result = createAllDayDateRange(editStartDate, editEndDate);
        startDateTime = result.startDateTime;
        endDateTime = result.endDateTime;
      }

      let eventIdToUpdate = block.id;

      if (mode === 'this') {
        eventIdToUpdate = block.id;
      } else if (mode === 'all' || mode === 'future') {
        eventIdToUpdate = block.recurringEventId || block.id;
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

      setShowRecurringUpdateDialog(false);
      onClose();
    } catch (err) {
      setError('Kunde inte uppdatera event');
      console.error('Failed to update event:', err);
      setShowRecurringUpdateDialog(false);
    }
  };

  const header = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Titel"
            className="w-full text-xl font-bold bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg px-3 py-2 border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
          aria-label="Stäng"
        >
          <CloseIcon className="w-5 h-5" aria-hidden="true" />
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
    </>
  );

  const content = (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Date and Time Fields */}
      <DateTimeFields
        startDate={editStartDate}
        endDate={editEndDate}
        startTime={editStartTime}
        endTime={editEndTime}
        allDay={editAllDay}
        onStartDateChange={setEditStartDate}
        onEndDateChange={setEditEndDate}
        onStartTimeChange={setEditStartTime}
        onEndTimeChange={setEditEndTime}
      />

      <EventFormFields
        description={editDescription}
        onDescriptionChange={setEditDescription}
        allDay={editAllDay}
        onAllDayChange={setEditAllDay}
        allDayId="editAllDay"
        error={error}
      />

      {/* Recurrence */}
      <div>
        <RecurrenceSelector
          value={editRecurrenceRule}
          onChange={setEditRecurrenceRule}
          disabled={updateEvent.isPending}
        />
        {(recurrenceDescription || block.recurringEventId) && (
          <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <div className="flex items-start gap-2">
              <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-300">
                  {block.recurringEventId ? 'Del av återkommande serie' : 'Återkommande händelse'}
                </p>
                {recurrenceDescription && <p className="text-xs text-blue-200/80 mt-0.5">{recurrenceDescription}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Responsibility */}
      <ResponsibilitySelector
        currentCalendarId={block.calendarId}
        onSelect={handleChangeResponsibility}
        disabled={moveEvent.isPending}
        compact={true}
      />

      {moveEvent.isPending && (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Flyttar event...</span>
        </div>
      )}
    </div>
  );

  const footer = (
    <footer className="p-4 border-t border-[var(--color-bg-tertiary)] space-y-2">
      <div className="flex gap-3">
        <button
          onClick={onClose}
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
      <button
        onClick={handleDeleteClick}
        disabled={deleteEvent.isPending}
        className="w-full py-2 px-4 rounded-lg bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors disabled:opacity-50"
      >
        Ta bort event
      </button>
    </footer>
  );

  return (
    <>
      <EventPanelLayout onClose={onClose} header={header} footer={footer} borderColor={person.color}>
        {content}
      </EventPanelLayout>

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
