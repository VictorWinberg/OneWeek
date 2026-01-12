import { useEffect, useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { useAuthStore } from '@/stores/authStore';
import { useCreateEvent } from '@/hooks/useCalendarQueries';
import { getInitial } from '@/types';
import { RecurrenceSelector } from '@/components/EventDetail/RecurrenceSelector';
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
  const { config, getPersonById } = useConfigStore();
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

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--color-bg-secondary)] shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <header className="p-4 border-b border-[var(--color-bg-tertiary)]">
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
        </header>

        {/* Content */}
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

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Beskrivning
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Valfri beskrivning..."
              rows={3}
              className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
            />
          </div>

          {/* Calendar Selection */}
          <div>
            <label htmlFor="calendar" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Ansvarig *
            </label>
            <div className="space-y-2">
              {config.calendars.map((cal) => {
                const person = getPersonById(cal.id);
                if (!person) return null;
                const initial = getInitial(person.name);
                const isSelected = calendarId === cal.id;

                return (
                  <button
                    key={cal.id}
                    type="button"
                    onClick={() => setCalendarId(cal.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-[var(--color-bg-tertiary)] ring-2 ring-[var(--color-accent)]'
                        : 'bg-[var(--color-bg-tertiary)]/50 hover:bg-[var(--color-bg-tertiary)]'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: person.color,
                        color: 'var(--color-bg-primary)',
                      }}
                    >
                      {initial.charAt(0)}
                    </div>
                    <span className="text-[var(--color-text-primary)] font-medium">{person.name}</span>
                    {isSelected && (
                      <svg
                        className="w-5 h-5 ml-auto text-[var(--color-accent)]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Startdatum *
              </label>
              <input
                id="startDate"
                type="date"
                value={new Intl.DateTimeFormat('sv-SE').format(startDate)}
                onChange={(e) => {
                  const newStartDate = new Date(e.target.value + 'T12:00:00');
                  setStartDate(newStartDate);
                  // If end date is before start date, update it
                  if (endDate < newStartDate) {
                    setEndDate(newStartDate);
                  }
                }}
                className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Slutdatum *
              </label>
              <input
                id="endDate"
                type="date"
                value={new Intl.DateTimeFormat('sv-SE').format(endDate)}
                onChange={(e) => setEndDate(new Date(e.target.value + 'T12:00:00'))}
                min={new Intl.DateTimeFormat('sv-SE').format(startDate)}
                className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2">
            <input
              id="allDay"
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--color-bg-tertiary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <label htmlFor="allDay" className="text-sm text-[var(--color-text-primary)]">
              Heldag
            </label>
          </div>

          {/* Time Selection (only if not all day) */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startTime"
                  className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
                >
                  Starttid *
                </label>
                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Sluttid *
                </label>
                <input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-bg-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Recurrence */}
          <RecurrenceSelector value={recurrenceRule} onChange={setRecurrenceRule} disabled={createEvent.isPending} />

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-200 text-sm">{error}</div>
          )}
        </form>

        {/* Footer */}
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
      </div>
    </>
  );
}
