import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, addDays, getWeek, parseISO, isValid, isWithinInterval } from 'date-fns';
import { sv } from 'date-fns/locale';

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function formatWeekHeader(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });

  const startMonth = format(start, 'MMMM', { locale: sv });
  const endMonth = format(end, 'MMMM', { locale: sv });
  const year = format(start, 'yyyy');

  if (startMonth === endMonth) {
    return `${format(start, 'd')}–${format(end, 'd')} ${startMonth} ${year}`;
  }

  return `${format(start, 'd')} ${startMonth} – ${format(end, 'd')} ${endMonth} ${year}`;
}

export function formatWeekHeaderShort(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });

  const startMonth = format(start, 'MMM', { locale: sv });
  const endMonth = format(end, 'MMM', { locale: sv });

  if (startMonth === endMonth) {
    return `${format(start, 'd')}–${format(end, 'd')} ${startMonth}`;
  }

  return `${format(start, 'd')} ${startMonth} – ${format(end, 'd')} ${endMonth}`;
}

export function getWeekYear(date: Date): string {
  // Week 1 is the week containing January 4th (ISO week numbering)
  // For weeks spanning year boundaries, we need to determine which year the week number belongs to
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });

  // Check if the week contains January 4th of the end year (most common case for week 1)
  const jan4EndYear = new Date(end.getFullYear(), 0, 4);
  if (start <= jan4EndYear && end >= jan4EndYear) {
    return format(jan4EndYear, 'yyyy');
  }

  // Check if the week contains January 4th of the start year
  const jan4StartYear = new Date(start.getFullYear(), 0, 4);
  if (start <= jan4StartYear && end >= jan4StartYear) {
    return format(jan4StartYear, 'yyyy');
  }

  // Otherwise, use the year of the start date
  return format(start, 'yyyy');
}

export function formatDayHeader(date: Date): string {
  return format(date, 'EEEE d/M', { locale: sv });
}

export function formatDayShort(date: Date): string {
  return format(date, 'EEE', { locale: sv });
}

export function formatDayNumber(date: Date): string {
  return format(date, 'd');
}

export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

export function formatDateFull(date: Date): string {
  return format(date, 'd MMMM yyyy', { locale: sv });
}

export { isToday, isSameDay, addDays };

export function getWeekNumber(date: Date): number {
  return getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });
}

/**
 * Check if a given week contains today's date
 */
export function isCurrentWeek(date: Date): boolean {
  const today = new Date();
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  return isWithinInterval(today, { start: weekStart, end: weekEnd });
}

/**
 * Calculate the duration between two dates in milliseconds
 */
export function calculateEventDuration(startTime: Date, endTime: Date): number {
  return endTime.getTime() - startTime.getTime();
}

/**
 * Preserve the time from originalDate while using the date from newDate
 */
export function preserveTimeOnNewDate(originalDate: Date, newDate: Date): Date {
  const result = new Date(newDate);
  result.setHours(
    originalDate.getHours(),
    originalDate.getMinutes(),
    originalDate.getSeconds(),
    originalDate.getMilliseconds()
  );
  return result;
}

/**
 * Create start and end times for an all-day event
 * All-day events start at midnight and end at midnight of the next day
 */
export function createAllDayEventTimes(date: Date): { startTime: Date; endTime: Date } {
  const startTime = new Date(date);
  startTime.setHours(0, 0, 0, 0);

  const endTime = new Date(date);
  endTime.setDate(endTime.getDate() + 1);
  endTime.setHours(0, 0, 0, 0);

  return { startTime, endTime };
}

/**
 * Create start and end times for a timed event
 */
export function createTimedEventTimes(
  date: Date,
  hour: number,
  minute: number,
  durationMs: number
): { startTime: Date; endTime: Date } {
  const startTime = new Date(date);
  startTime.setHours(hour, minute, 0, 0);

  const endTime = new Date(startTime.getTime() + durationMs);

  return { startTime, endTime };
}

/**
 * Create a date with specific time components
 */
export function createDateWithTime(date: Date, hour: number, minute: number): Date {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

/**
 * Get Monday of the week for a given date as a formatted string (yyyy-MM-dd)
 */
export function getWeekMonday(date: Date): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

/**
 * Parse date from URL parameter string
 */
export function parseDateParam(dateParam: string | undefined): Date | null {
  if (!dateParam) return null;
  try {
    const parsed = parseISO(dateParam);
    if (isValid(parsed)) {
      return parsed;
    }
  } catch {
    // Invalid date format
  }
  return null;
}

/**
 * Find the index where the current time indicator should be inserted in a list of timed blocks.
 * Returns the index of the first block that starts after the current time, or -1 if all blocks are in the past.
 *
 * @param date - The date being viewed (used for normalization)
 * @param timedBlocks - Array of timed blocks (non-all-day events) sorted by start time
 * @param isCurrentDay - Whether the date is today
 * @returns The index where the indicator should be inserted, or -1 if it should be after all events
 */
export function findCurrentTimeIndex(
  date: Date,
  timedBlocks: Array<{ startTime: Date }>,
  isCurrentDay: boolean
): number {
  if (!isCurrentDay) {
    return -1;
  }

  const now = new Date();

  return timedBlocks.findIndex((block) => {
    const blockStart = new Date(block.startTime);
    // Normalize both times to the same day (the date we're viewing)
    const normalizedNow = new Date(date);
    normalizedNow.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    const normalizedBlockStart = new Date(date);
    normalizedBlockStart.setHours(
      blockStart.getHours(),
      blockStart.getMinutes(),
      blockStart.getSeconds(),
      blockStart.getMilliseconds()
    );
    return normalizedBlockStart > normalizedNow;
  });
}
