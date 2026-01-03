import rrule, { type Options, Frequency, Weekday } from 'rrule';

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: string;
  byDay?: string[];
}

// Map our frequency strings to RRule frequency constants
const FREQUENCY_MAP: Record<RecurrenceRule['frequency'], Frequency> = {
  DAILY: Frequency.DAILY,
  WEEKLY: Frequency.WEEKLY,
  MONTHLY: Frequency.MONTHLY,
  YEARLY: Frequency.YEARLY,
};

// Valid weekday strings for byDay
type WeekdayStr = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export function recurrenceRuleToRRULE(rule: RecurrenceRule): string {
  const options: Partial<Options> = {
    freq: FREQUENCY_MAP[rule.frequency],
  };

  if (rule.interval && rule.interval > 1) {
    options.interval = rule.interval;
  }

  if (rule.byDay && rule.byDay.length > 0) {
    options.byweekday = rule.byDay.map((day) => Weekday.fromStr(day as WeekdayStr));
  }

  // count specifies total number of occurrences - use as-is
  if (rule.count) {
    options.count = rule.count;
  } else if (rule.until) {
    options.until = new Date(rule.until);
  }

  const rruleInstance = new rrule.RRule(options);

  return rruleInstance.toString();
}
