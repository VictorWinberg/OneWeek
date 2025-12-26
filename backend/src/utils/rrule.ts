import { formatDateForRRule } from './date.js';

/**
 * Remove UNTIL and COUNT parameters from an RRULE string
 */
export function stripRRuleEndParams(rrule: string): string {
  return rrule
    .replace(/;UNTIL=[^;]+/g, '')
    .replace(/;COUNT=\d+/g, '');
}

/**
 * Add UNTIL parameter to an RRULE string
 */
export function addUntilToRRule(rrule: string, untilDate: Date): string {
  const cleanedRrule = stripRRuleEndParams(rrule);
  const untilStr = formatDateForRRule(untilDate);
  return `${cleanedRrule};UNTIL=${untilStr}`;
}

/**
 * Update recurrence rules array to add UNTIL parameter
 * Only modifies RRULE entries, preserves other entries (EXDATE, etc.)
 */
export function updateRecurrenceWithUntil(recurrence: string[], untilDate: Date): string[] {
  return recurrence.map((rule) => {
    if (rule.startsWith('RRULE:')) {
      return addUntilToRRule(rule, untilDate);
    }
    return rule;
  });
}

/**
 * Check if a string is an RRULE
 */
export function isRRule(rule: string): boolean {
  return rule.startsWith('RRULE:');
}

/**
 * Extract the frequency from an RRULE string
 */
export function extractFrequency(rrule: string): string | null {
  const match = rrule.match(/FREQ=([A-Z]+)/);
  return match ? match[1] : null;
}

/**
 * Check if a recurrence array contains any RRULE
 */
export function hasRecurrenceRule(recurrence: string[] | null | undefined): boolean {
  if (!recurrence || recurrence.length === 0) {
    return false;
  }
  return recurrence.some(isRRule);
}

