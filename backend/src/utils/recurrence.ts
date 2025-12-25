/**
 * Converts a RecurrenceRule object to an RRULE string format for Google Calendar API
 */
export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: string; // ISO date string
  byDay?: string[]; // e.g., ['MO', 'WE', 'FR']
}

export function recurrenceRuleToRRULE(rule: RecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.frequency}`];

  if (rule.interval && rule.interval > 1) {
    parts.push(`INTERVAL=${rule.interval}`);
  }

  if (rule.byDay && rule.byDay.length > 0) {
    parts.push(`BYDAY=${rule.byDay.join(',')}`);
  }

  if (rule.count) {
    parts.push(`COUNT=${rule.count}`);
  } else if (rule.until) {
    // Convert ISO date to RRULE format (YYYYMMDDTHHMMSSZ)
    const date = new Date(rule.until);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const untilStr = `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    parts.push(`UNTIL=${untilStr}`);
  }

  return `RRULE:${parts.join(';')}`;
}
