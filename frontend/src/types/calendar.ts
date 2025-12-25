export interface CalendarSource {
  id: string; // Google Calendar ID - also used as person identifier
  name: string;
  color: string;
}

export interface CalendarConfig {
  calendars: CalendarSource[];
}
