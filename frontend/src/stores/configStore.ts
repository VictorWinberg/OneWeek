import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalendarConfig, CalendarSource, PersonId, Person } from '../types';
import { PERSONS, PERSON_LIST } from '../types';

interface ConfigState {
  config: CalendarConfig;
  persons: Person[];
  isConfigured: boolean;

  // Actions
  setCalendarConfig: (calendars: CalendarSource[]) => void;
  addCalendar: (calendar: CalendarSource) => void;
  removeCalendar: (calendarId: string) => void;
  updateCalendar: (calendarId: string, personId: PersonId) => void;
  getCalendarForPerson: (personId: PersonId) => CalendarSource | undefined;
  getPersonForCalendar: (calendarId: string) => Person | undefined;
  clearConfig: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: { calendars: [] },
      persons: PERSON_LIST,
      isConfigured: false,

      setCalendarConfig: (calendars) => {
        set({
          config: { calendars },
          isConfigured: calendars.length > 0,
        });
      },

      addCalendar: (calendar) => {
        const current = get().config.calendars;
        // Remove any existing calendar with same person
        const filtered = current.filter((c) => c.personId !== calendar.personId);
        set({
          config: { calendars: [...filtered, calendar] },
          isConfigured: true,
        });
      },

      removeCalendar: (calendarId) => {
        const current = get().config.calendars;
        const filtered = current.filter((c) => c.id !== calendarId);
        set({
          config: { calendars: filtered },
          isConfigured: filtered.length > 0,
        });
      },

      updateCalendar: (calendarId, personId) => {
        const current = get().config.calendars;
        const updated = current.map((c) =>
          c.id === calendarId ? { ...c, personId } : c
        );
        set({ config: { calendars: updated } });
      },

      getCalendarForPerson: (personId) => {
        return get().config.calendars.find((c) => c.personId === personId);
      },

      getPersonForCalendar: (calendarId) => {
        const calendar = get().config.calendars.find((c) => c.id === calendarId);
        return calendar ? PERSONS[calendar.personId] : undefined;
      },

      clearConfig: () => {
        set({
          config: { calendars: [] },
          isConfigured: false,
        });
      },
    }),
    {
      name: 'oneweek-config',
    }
  )
);

