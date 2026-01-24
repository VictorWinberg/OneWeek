import { useEffect, useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { useAuthStore } from '@/stores/authStore';
import { useCreateEvent } from '@/hooks/useCalendarQueries';
import { RecurrenceSelector } from '@/components/EventDetail/RecurrenceSelector';
import { ResponsibilitySelector } from '@/components/EventDetail/ResponsibilitySelector';
import { DateTimeFields } from '@/components/EventDetail/DateTimeFields';
import { EventPanelLayout } from '@/components/EventDetail/EventPanelLayout';
import { EventFormFields } from '@/components/EventDetail/EventFormFields';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { calculateSmartDefaultTimes, calculateEndTimeWithDuration } from '@/utils/timeUtils';
import { getDefaultCalendarId, prepareEventData } from '@/utils/eventCreationUtils';
import type { RecurrenceRule } from '@/types/block';

interface EventCreatePanelProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date;
  defaultCalendarId?: string;
  defaultStartTime?: string; // Format: "HH:MM"
  defaultEndTime?: string; // Format: "HH:MM"
}

export function EventCreatePanel({
  isOpen,
  onClose,
  defaultDate,
  defaultCalendarId,
  defaultStartTime,
  defaultEndTime,
}: EventCreatePanelProps) {
  const { config } = useConfigStore();
  const { user } = useAuthStore();
  const createEvent = useCreateEvent();

  // Get the default calendar using utility
  const getDefaultCalendarIdForForm = () => getDefaultCalendarId(config.calendars, user, defaultCalendarId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [calendarId, setCalendarId] = useState(getDefaultCalendarIdForForm());
  const [startDate, setStartDate] = useState(defaultDate || new Date());
  const [endDate, setEndDate] = useState(defaultDate || new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handler for start time change that maintains duration
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    // Use utility to calculate new end time maintaining duration
    const newEndTime = calculateEndTimeWithDuration(startTime, endTime, newStartTime);
    setEndTime(newEndTime);
  };

  // Reset form when opened - intentional setState in effect for form reset
  // eslint-disable-next-line react-compiler/react-compiler
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setCalendarId(getDefaultCalendarIdForForm());

      const dateToUse = defaultDate || new Date();
      setStartDate(dateToUse);
      setEndDate(dateToUse);

      // Use provided default times if available, otherwise calculate smart defaults
      if (defaultStartTime && defaultEndTime) {
        setStartTime(defaultStartTime);
        setEndTime(defaultEndTime);
      } else {
        // Use utility to calculate smart default times
        const { startTime: smartStart, endTime: smartEnd } = calculateSmartDefaultTimes(dateToUse);
        setStartTime(smartStart);
        setEndTime(smartEnd);
      }

      setAllDay(false);
      setRecurrenceRule(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultDate, defaultCalendarId, defaultStartTime, defaultEndTime, config.calendars, user?.email]);

  useEscapeKey(onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Titel krävs');
      return;
    }

    if (!calendarId) {
      setError('Välj en kalender');
      return;
    }

    setError(null);

    try {
      // Use utility to prepare and validate event data
      const { startDateTime, endDateTime, validationError } = prepareEventData(
        startDate,
        endDate,
        startTime,
        endTime,
        allDay
      );

      if (validationError) {
        setError(validationError);
        return;
      }

      await createEvent.mutateAsync({
        calendarId,
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        allDay,
        recurrenceRule,
      });

      onClose();
    } catch (err) {
      setError('Kunde inte skapa event');
      console.error('Failed to create event:', err);
    }
  };

  const header = (
    <div className="flex items-start justify-between">
      <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Skapa nytt event</h2>
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
  );

  const content = (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
          Titel *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="T.ex. Läkarbesök, Möte, Middag"
          className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
          autoFocus
        />
      </div>

      {/* Date and Time Fields */}
      <DateTimeFields
        startDate={startDate}
        endDate={endDate}
        startTime={startTime}
        endTime={endTime}
        allDay={allDay}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onStartTimeChange={handleStartTimeChange}
        onEndTimeChange={setEndTime}
        startDateId="startDate"
        endDateId="endDate"
        startTimeId="startTime"
        endTimeId="endTime"
      />

      <EventFormFields
        description={description}
        onDescriptionChange={setDescription}
        allDay={allDay}
        onAllDayChange={setAllDay}
        allDayId="allDay"
        error={error}
      />

      {/* Recurrence */}
      <RecurrenceSelector value={recurrenceRule} onChange={setRecurrenceRule} disabled={createEvent.isPending} />

      {/* Calendar Selection */}
      <ResponsibilitySelector
        currentCalendarId={calendarId || ''}
        onSelect={setCalendarId}
        disabled={createEvent.isPending}
        compact={true}
      />
    </form>
  );

  const footer = (
    <footer className="p-4 border-t border-[var(--color-bg-tertiary)] flex gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={createEvent.isPending}
        className="flex-1 py-2 px-4 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors disabled:opacity-50"
      >
        Avbryt
      </button>
      <button
        onClick={handleSubmit}
        disabled={createEvent.isPending || !title.trim()}
        className="flex-1 py-2 px-4 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
      >
        {createEvent.isPending ? 'Skapar...' : 'Skapa event'}
      </button>
    </footer>
  );

  return <EventPanelLayout onClose={onClose} header={header} footer={footer}>{content}</EventPanelLayout>;
}
