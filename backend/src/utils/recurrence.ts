import RRule from 'rrule';

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: string;
  byDay?: string[];
}

export function recurrenceRuleToRRULE(rule: RecurrenceRule): string {
  const frequencyMap: Record<string, any> = {
    DAILY: 3,
    WEEKLY: 2,
    MONTHLY: 1,
    YEARLY: 0,
  };

  const options: any = {
    freq: frequencyMap[rule.frequency] ?? 3,
  };

  if (rule.interval && rule.interval > 1) {
    options.interval = rule.interval;
  }

  if (rule.byDay && rule.byDay.length > 0) {
    options.byweekday = rule.byDay.map((day) => RRule.Weekday.fromStr(day as any));
  }

  if (rule.count) {
    options.count = rule.count + 1;
  } else if (rule.until) {
    options.until = new Date(rule.until);
  }

  const rrule = new RRule.RRule(options);

  return rrule.toString();
}
