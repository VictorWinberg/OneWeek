import { create } from 'zustand';
import type { CalendarConfig, CalendarSource, Person } from '@/types';
import { configApi } from '@/services/api';

interface ConfigState {
  config: CalendarConfig;
  persons: Person[]; // Dynamic list based on calendars
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConfig: () => Promise<void>;
  setCalendarConfig: (calendars: CalendarSource[]) => void;
  addCalendar: (calendar: CalendarSource) => void;
  removeCalendar: (calendarId: string) => void;
  updateCalendar: (calendarId: string, updates: Partial<CalendarSource>) => void;
  getCalendarById: (calendarId: string) => CalendarSource | undefined;
  getPersonById: (calendarId: string) => Person | undefined;
  clearConfig: () => void;
}

export const useConfigStore = create<ConfigState>()((set, get) => ({
  config: { calendars: [] },
  persons: [],
  isConfigured: false,
  isLoading: false,
  error: null,

  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const calendars = await configApi.getCalendars();
      set({
        config: { calendars },
        persons: calendars, // Calendars ARE the persons
        isConfigured: calendars.length > 0,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load config',
        isLoading: false,
        isConfigured: false,
      });
    }
  },

  setCalendarConfig: (calendars) => {
    set({
      config: { calendars },
      persons: calendars,
      isConfigured: calendars.length > 0,
    });
  },

  addCalendar: (calendar) => {
    const current = get().config.calendars;
    const filtered = current.filter((c) => c.id !== calendar.id);
    const updated = [...filtered, calendar];
    set({
      config: { calendars: updated },
      persons: updated,
      isConfigured: true,
    });
  },

  removeCalendar: (calendarId) => {
    const current = get().config.calendars;
    const filtered = current.filter((c) => c.id !== calendarId);
    set({
      config: { calendars: filtered },
      persons: filtered,
      isConfigured: filtered.length > 0,
    });
  },

  updateCalendar: (calendarId, updates) => {
    const current = get().config.calendars;
    const updated = current.map((c) => (c.id === calendarId ? { ...c, ...updates } : c));
    set({
      config: { calendars: updated },
      persons: updated,
    });
  },

  getCalendarById: (calendarId) => {
    return get().config.calendars.find((c) => c.id === calendarId);
  },

  getPersonById: (calendarId) => {
    return get().config.calendars.find((c) => c.id === calendarId);
  },

  clearConfig: () => {
    set({
      config: { calendars: [] },
      persons: [],
      isConfigured: false,
    });
  },
}));
