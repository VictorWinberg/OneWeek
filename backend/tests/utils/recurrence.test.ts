import { describe, it, expect } from 'vitest';
import { recurrenceRuleToRRULE, type RecurrenceRule } from '../../src/utils/recurrence.js';

describe('recurrence', () => {
  describe('recurrenceRuleToRRULE', () => {
    describe('frequency patterns', () => {
      it('should create daily recurrence', () => {
        const rule: RecurrenceRule = { frequency: 'DAILY' };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('RRULE:');
        expect(rrule).toContain('FREQ=DAILY');
      });

      it('should create weekly recurrence', () => {
        const rule: RecurrenceRule = { frequency: 'WEEKLY' };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('FREQ=WEEKLY');
      });

      it('should create monthly recurrence', () => {
        const rule: RecurrenceRule = { frequency: 'MONTHLY' };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('FREQ=MONTHLY');
      });

      it('should create yearly recurrence', () => {
        const rule: RecurrenceRule = { frequency: 'YEARLY' };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('FREQ=YEARLY');
      });
    });

    describe('interval', () => {
      it('should include interval when greater than 1', () => {
        const rule: RecurrenceRule = { frequency: 'DAILY', interval: 2 };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('INTERVAL=2');
      });

      it('should not include interval when 1', () => {
        const rule: RecurrenceRule = { frequency: 'DAILY', interval: 1 };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).not.toContain('INTERVAL');
      });

      it('should handle interval of 3 weeks', () => {
        const rule: RecurrenceRule = { frequency: 'WEEKLY', interval: 3 };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('FREQ=WEEKLY');
        expect(rrule).toContain('INTERVAL=3');
      });
    });

    describe('byDay (weekday selection)', () => {
      it('should include single weekday', () => {
        const rule: RecurrenceRule = {
          frequency: 'WEEKLY',
          byDay: ['MO'],
        };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('BYDAY=MO');
      });

      it('should include multiple weekdays', () => {
        const rule: RecurrenceRule = {
          frequency: 'WEEKLY',
          byDay: ['MO', 'WE', 'FR'],
        };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('BYDAY=');
        expect(rrule).toMatch(/MO/);
        expect(rrule).toMatch(/WE/);
        expect(rrule).toMatch(/FR/);
      });

      it('should handle all weekdays', () => {
        const rule: RecurrenceRule = {
          frequency: 'WEEKLY',
          byDay: ['MO', 'TU', 'WE', 'TH', 'FR'],
        };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('BYDAY=');
      });

      it('should not include byDay when array is empty', () => {
        const rule: RecurrenceRule = {
          frequency: 'WEEKLY',
          byDay: [],
        };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).not.toContain('BYDAY');
      });
    });

    describe('count termination', () => {
      it('should include count when specified', () => {
        const rule: RecurrenceRule = {
          frequency: 'DAILY',
          count: 10,
        };
        const rrule = recurrenceRuleToRRULE(rule);

        // Note: The implementation adds 1 to count
        expect(rrule).toContain('COUNT=11');
      });

      it('should work with weekly recurrence and count', () => {
        const rule: RecurrenceRule = {
          frequency: 'WEEKLY',
          byDay: ['MO'],
          count: 5,
        };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('FREQ=WEEKLY');
        expect(rrule).toContain('COUNT=6');
        expect(rrule).toContain('BYDAY=MO');
      });
    });

    describe('until termination', () => {
      it('should include until date when specified', () => {
        const rule: RecurrenceRule = {
          frequency: 'DAILY',
          until: '2025-12-31',
        };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('UNTIL=');
      });

      it('should prefer count over until when both specified', () => {
        const rule: RecurrenceRule = {
          frequency: 'DAILY',
          count: 5,
          until: '2025-12-31',
        };
        const rrule = recurrenceRuleToRRULE(rule);

        // Count takes precedence
        expect(rrule).toContain('COUNT=');
        expect(rrule).not.toContain('UNTIL=');
      });
    });

    describe('complex rules', () => {
      it('should handle biweekly on specific days', () => {
        const rule: RecurrenceRule = {
          frequency: 'WEEKLY',
          interval: 2,
          byDay: ['TU', 'TH'],
        };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('FREQ=WEEKLY');
        expect(rrule).toContain('INTERVAL=2');
        expect(rrule).toContain('BYDAY=');
      });

      it('should handle monthly with count', () => {
        const rule: RecurrenceRule = {
          frequency: 'MONTHLY',
          interval: 1,
          count: 12,
        };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('FREQ=MONTHLY');
        expect(rrule).toContain('COUNT=13');
        expect(rrule).not.toContain('INTERVAL');
      });

      it('should handle daily every 3 days for 10 occurrences', () => {
        const rule: RecurrenceRule = {
          frequency: 'DAILY',
          interval: 3,
          count: 10,
        };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toContain('FREQ=DAILY');
        expect(rrule).toContain('INTERVAL=3');
        expect(rrule).toContain('COUNT=11');
      });
    });

    describe('RRULE format validation', () => {
      it('should start with RRULE:', () => {
        const rule: RecurrenceRule = { frequency: 'DAILY' };
        const rrule = recurrenceRuleToRRULE(rule);

        expect(rrule).toMatch(/^RRULE:/);
      });

      it('should be a valid RRULE string format', () => {
        const rule: RecurrenceRule = {
          frequency: 'WEEKLY',
          interval: 2,
          byDay: ['MO', 'FR'],
          count: 10,
        };
        const rrule = recurrenceRuleToRRULE(rule);

        // Should be semicolon-separated key=value pairs
        expect(rrule).toMatch(/^RRULE:FREQ=\w+/);
      });
    });
  });
});

