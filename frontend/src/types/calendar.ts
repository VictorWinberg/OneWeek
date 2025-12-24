import type { PersonId } from './person';

export interface CalendarSource {
  id: string; // Google Calendar ID
  name: string;
  personId: PersonId;
}

export interface CalendarConfig {
  calendars: CalendarSource[];
}

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  calendars: [],
};

