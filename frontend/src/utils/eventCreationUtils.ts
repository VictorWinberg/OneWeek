/**
 * Event creation utilities
 * Helpers for creating new events with smart defaults
 */

import type { Calendar } from '@/types/calendar';
import { parseTimeString } from './timeUtils';

interface UserInfo {
  email?: string;
}

/**
 * Get the default calendar ID for event creation
 * Priority: defaultCalendarId > user's email calendar > first calendar
 */
export function getDefaultCalendarId(calendars: Calendar[], user: UserInfo | null, defaultCalendarId?: string): string {
  if (defaultCalendarId) return defaultCalendarId;

  if (user?.email) {
    const userCalendar = calendars.find((cal) => cal.id === user.email);
    if (userCalendar) return user.email;
  }

  return calendars[0]?.id || '';
}

/**
 * Create a DateTime from a date and time string
 */
export function createEventDateTime(date: Date, time: string, allDay: boolean): Date {
  const result = new Date(date);

  if (allDay) {
    result.setHours(0, 0, 0, 0);
  } else {
    const { hour, minute } = parseTimeString(time);
    result.setHours(hour, minute, 0, 0);
  }

  return result;
}

/**
 * Create end DateTime for all-day events (end of day boundary)
 */
export function createAllDayEndDateTime(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Validate event times
 * Returns an error message or null if valid
 */
export function validateEventTimes(startDateTime: Date, endDateTime: Date, allDay: boolean): string | null {
  if (!allDay && endDateTime <= startDateTime) {
    return 'Sluttid måste vara efter starttid';
  }
  return null;
}

/**
 * Prepare event data for creation
 */
export interface EventCreateData {
  startDateTime: Date;
  endDateTime: Date;
  validationError: string | null;
}

export function prepareEventData(
  startDate: Date,
  endDate: Date,
  startTime: string,
  endTime: string,
  allDay: boolean
): EventCreateData {
  const startDateTime = createEventDateTime(startDate, startTime, allDay);
  const endDateTime = allDay ? createAllDayEndDateTime(endDate) : createEventDateTime(endDate, endTime, false);

  const validationError = validateEventTimes(startDateTime, endDateTime, allDay);

  return { startDateTime, endDateTime, validationError };
}
