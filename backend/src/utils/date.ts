/**
 * Parse a date string to ISO format
 */
export function toISOString(dateString: string): string {
  return new Date(dateString).toISOString();
}

/**
 * Check if a date string is valid
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Get the previous day at 23:59:59 for a given date
 * Used for RRULE UNTIL calculations
 */
export function getPreviousDayEnd(dateString: string): Date {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  date.setHours(23, 59, 59, 0);
  return date;
}

/**
 * Get the previous day at 23:59:59 UTC for an all-day event date
 */
export function getPreviousDayEndUTC(dateString: string): Date {
  const dateOnly = dateString.split('T')[0];
  const parts = dateOnly.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);

  return new Date(Date.UTC(year, month, day - 1, 23, 59, 59, 0));
}

/**
 * Calculate UNTIL date for RRULE based on event instance
 * @param instanceStartStr - The start date/time of the current instance
 * @param isAllDay - Whether this is an all-day event
 * @returns Date object representing the UNTIL date
 */
export function calculateUntilDate(instanceStartStr: string, isAllDay: boolean): Date {
  if (isAllDay) {
    return getPreviousDayEndUTC(instanceStartStr);
  } else {
    return getPreviousDayEnd(instanceStartStr);
  }
}

/**
 * Format a date for RRULE UNTIL parameter
 * Converts to format: YYYYMMDDTHHMMSSZ
 */
export function formatDateForRRule(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/**
 * Get the date-only portion of a datetime string (YYYY-MM-DD)
 */
export function getDateOnly(dateTimeString: string): string {
  return dateTimeString.split('T')[0];
}

/**
 * Build event start/end objects for Google Calendar API
 */
export function buildEventDatetime(
  dateTimeString: string,
  isAllDay: boolean,
  timeZone: string = 'Europe/Stockholm'
): { date?: string; dateTime?: string; timeZone?: string } {
  if (isAllDay) {
    return { date: getDateOnly(dateTimeString) };
  }
  return { dateTime: dateTimeString, timeZone };
}

