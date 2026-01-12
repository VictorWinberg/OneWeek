import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, addDays, getWeek, parseISO, isValid } from 'date-fns';
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
