export interface BlockMetadata {
  category?: string;
  originalCalendarId?: string;
}

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RecurrenceDay = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // e.g., every 2 weeks
  count?: number; // number of occurrences
  until?: Date; // end date
  byDay?: RecurrenceDay[]; // e.g., ['MO', 'WE', 'FR'] for weekly
}

export interface Block {
  id: string; // Google event ID
  calendarId: string; // Google calendar ID - also serves as person/entity identifier
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  metadata: BlockMetadata;
  recurrence?: string[]; // RRULE strings from Google Calendar
  recurringEventId?: string; // ID of the recurring event series
}
