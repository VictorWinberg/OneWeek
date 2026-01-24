/**
 * Converts date and time strings to a Date object
 */
export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Validates that end time is after start time
 */
export function validateTimeRange(startDateTime: Date, endDateTime: Date): string | null {
  if (endDateTime <= startDateTime) {
    return 'Sluttid måste vara efter starttid';
  }
  return null;
}

/**
 * Converts form values to Date objects for all-day events
 */
export function createAllDayDateRange(startDate: Date, endDate: Date): { startDateTime: Date; endDateTime: Date } {
  const startDateTime = new Date(startDate);
  startDateTime.setHours(0, 0, 0, 0);

  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);

  return { startDateTime, endDateTime };
}

/**
 * Converts form values to Date objects for timed events
 */
export function createTimedDateRange(
  startDate: Date,
  endDate: Date,
  startTime: string,
  endTime: string
): { startDateTime: Date; endDateTime: Date; validationError: string | null } {
  const startDateTime = combineDateAndTime(startDate, startTime);
  const endDateTime = combineDateAndTime(endDate, endTime);

  const validationError = validateTimeRange(startDateTime, endDateTime);

  return { startDateTime, endDateTime, validationError };
}

