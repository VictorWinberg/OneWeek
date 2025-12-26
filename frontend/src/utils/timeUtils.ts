/**
 * Time manipulation utilities
 * Handles time string conversions and calculations
 */

/**
 * Convert a time string "HH:MM" to total minutes
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert total minutes to a time string "HH:MM"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format hour and minute as a time string "HH:MM"
 */
export function formatTimeString(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Parse a time string "HH:MM" into hour and minute components
 */
export function parseTimeString(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number);
  return { hour, minute };
}

/**
 * Calculate smart default times based on current time
 * If today, returns next hour rounded up; otherwise returns 09:00-10:00
 */
export function calculateSmartDefaultTimes(date: Date): { startTime: string; endTime: string } {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    // Round up to next hour
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const hours = nextHour.getHours();
    const startTime = formatTimeString(hours, 0);
    const endTime = formatTimeString((hours + 1) % 24, 0);
    return { startTime, endTime };
  }

  return { startTime: '09:00', endTime: '10:00' };
}

/**
 * Validate that end time is after start time
 */
export function validateTimeRange(startTime: string, endTime: string): boolean {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return endMinutes > startMinutes;
}

/**
 * Calculate end time by maintaining duration when start time changes
 */
export function calculateEndTimeWithDuration(
  oldStartTime: string,
  oldEndTime: string,
  newStartTime: string
): string {
  const oldStartMinutes = timeToMinutes(oldStartTime);
  const oldEndMinutes = timeToMinutes(oldEndTime);
  const duration = oldEndMinutes - oldStartMinutes;
  const newStartMinutes = timeToMinutes(newStartTime);
  const newEndMinutes = newStartMinutes + duration;
  return minutesToTime(newEndMinutes);
}

/**
 * Calculate the next hour time slot from a given hour and minute
 * Returns start and end time strings for a 1-hour event
 */
export function calculateNextHourTimeSlot(
  hour: number,
  minute: number
): { startTime: string; endTime: string } {
  const startTime = formatTimeString(hour, minute);
  const endHour = (hour + 1) % 24;
  const endTime = formatTimeString(endHour, minute);
  return { startTime, endTime };
}

