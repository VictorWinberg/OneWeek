import rrule, { type Options } from 'rrule';

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: string;
  byDay?: string[];
}

// Map our frequency strings to RRule frequency constants
const FREQUENCY_MAP: Record<RecurrenceRule['frequency'], rrule.Frequency> = {
  DAILY: rrule.Frequency.DAILY,
  WEEKLY: rrule.Frequency.WEEKLY,
  MONTHLY: rrule.Frequency.MONTHLY,
  YEARLY: rrule.Frequency.YEARLY,
};

export function recurrenceRuleToRRULE(rule: RecurrenceRule): string {
  const options: Partial<Options> = {
    freq: FREQUENCY_MAP[rule.frequency],
  };

  if (rule.interval && rule.interval > 1) {
    options.interval = rule.interval;
  }

  if (rule.byDay && rule.byDay.length > 0) {
    options.byweekday = rule.byDay.map((day) => rrule.Weekday.fromStr(day as rrule.WeekdayStr));
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
