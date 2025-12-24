import { useEffect, useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { calendarApi, type CalendarListItem } from '../../services/api';
import type { PersonId } from '../../types';
import { PERSON_LIST } from '../../types';

interface CalendarSetupProps {
  onComplete: () => void;
}

export function CalendarSetup({ onComplete }: CalendarSetupProps) {
  const { config, setCalendarConfig } = useConfigStore();
  const [googleCalendars, setGoogleCalendars] = useState<CalendarListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<PersonId, string>>({} as Record<PersonId, string>);

  // Load existing config
  useEffect(() => {
    const existing: Record<PersonId, string> = {} as Record<PersonId, string>;
    for (const cal of config.calendars) {
      existing[cal.personId] = cal.id;
    }
    setSelections(existing);
  }, [config.calendars]);

  // Fetch Google calendars
  useEffect(() => {
    async function fetchCalendars() {
      try {
        setIsLoading(true);
        const calendars = await calendarApi.listCalendars();
        setGoogleCalendars(calendars);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch calendars:', err);
        setError('Kunde inte hämta kalendrar. Försök igen.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchCalendars();
  }, []);

  const handleSelectCalendar = (personId: PersonId, calendarId: string) => {
    setSelections((prev) => ({
      ...prev,
      [personId]: calendarId,
    }));
  };

  const handleSave = () => {
    const calendars = Object.entries(selections)
      .filter(([_, calendarId]) => calendarId)
      .map(([personId, calendarId]) => {
        const googleCal = googleCalendars.find((c) => c.id === calendarId);
        return {
          id: calendarId,
          name: googleCal?.name || calendarId,
          personId: personId as PersonId,
        };
      });

    setCalendarConfig(calendars);
    onComplete();
  };

  const hasAnySelection = Object.values(selections).some((v) => v);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-[var(--color-text-secondary)]">Hämtar dina kalendrar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg"
        >
          Försök igen
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
        Konfigurera kalendrar
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-6">
        Välj vilken Google-kalender som tillhör varje familjemedlem.
      </p>

      <div className="space-y-4">
        {PERSON_LIST.map((person) => (
          <div
            key={person.id}
            className="p-4 rounded-lg bg-[var(--color-bg-tertiary)]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                style={{
                  backgroundColor: person.color,
                  color: 'var(--color-bg-primary)',
                }}
              >
                {person.initial.charAt(0)}
              </div>
              <span className="font-medium text-[var(--color-text-primary)]">
                {person.name}
              </span>
            </div>

            <select
              value={selections[person.id] || ''}
              onChange={(e) => handleSelectCalendar(person.id, e.target.value)}
              className="w-full p-3 rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-bg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">— Välj kalender —</option>
              {googleCalendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name} {cal.primary ? '(primär)' : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={handleSave}
          disabled={!hasAnySelection}
          className="flex-1 py-3 px-4 bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Spara konfiguration
        </button>
      </div>

      <p className="mt-4 text-xs text-[var(--color-text-secondary)] text-center">
        Du kan ändra detta senare i inställningarna.
      </p>
    </div>
  );
}

