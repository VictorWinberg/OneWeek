import { describe, it, expect } from 'vitest';
import {
  stripRRuleEndParams,
  addUntilToRRule,
  updateRecurrenceWithUntil,
  isRRule,
  extractFrequency,
  hasRecurrenceRule,
} from '../../src/utils/rrule.js';

describe('rrule utils', () => {
  describe('stripRRuleEndParams', () => {
    it('should remove UNTIL parameter', () => {
      const rrule = 'RRULE:FREQ=DAILY;UNTIL=20240315T235959Z';

      const result = stripRRuleEndParams(rrule);

      expect(result).toBe('RRULE:FREQ=DAILY');
    });

    it('should remove COUNT parameter', () => {
      const rrule = 'RRULE:FREQ=WEEKLY;COUNT=10';

      const result = stripRRuleEndParams(rrule);

      expect(result).toBe('RRULE:FREQ=WEEKLY');
    });

    it('should remove both UNTIL and COUNT', () => {
      const rrule = 'RRULE:FREQ=MONTHLY;UNTIL=20240315T235959Z;COUNT=5';

      const result = stripRRuleEndParams(rrule);

      expect(result).toBe('RRULE:FREQ=MONTHLY');
    });

    it('should preserve other parameters', () => {
      const rrule = 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;UNTIL=20240315T235959Z';

      const result = stripRRuleEndParams(rrule);

      expect(result).toBe('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR');
    });

    it('should return unchanged if no end params', () => {
      const rrule = 'RRULE:FREQ=DAILY;INTERVAL=1';

      const result = stripRRuleEndParams(rrule);

      expect(result).toBe('RRULE:FREQ=DAILY;INTERVAL=1');
    });
  });

  describe('addUntilToRRule', () => {
    it('should add UNTIL to simple RRULE', () => {
      const rrule = 'RRULE:FREQ=DAILY';
      const untilDate = new Date('2024-03-15T23:59:59.000Z');

      const result = addUntilToRRule(rrule, untilDate);

      expect(result).toBe('RRULE:FREQ=DAILY;UNTIL=20240315T235959Z');
    });

    it('should replace existing UNTIL', () => {
      const rrule = 'RRULE:FREQ=WEEKLY;UNTIL=20240101T000000Z';
      const untilDate = new Date('2024-06-30T23:59:59.000Z');

      const result = addUntilToRRule(rrule, untilDate);

      expect(result).toBe('RRULE:FREQ=WEEKLY;UNTIL=20240630T235959Z');
    });

    it('should replace existing COUNT with UNTIL', () => {
      const rrule = 'RRULE:FREQ=MONTHLY;COUNT=12';
      const untilDate = new Date('2024-12-31T23:59:59.000Z');

      const result = addUntilToRRule(rrule, untilDate);

      expect(result).toBe('RRULE:FREQ=MONTHLY;UNTIL=20241231T235959Z');
    });
  });

  describe('updateRecurrenceWithUntil', () => {
    it('should update RRULE entries only', () => {
      const recurrence = [
        'RRULE:FREQ=DAILY',
        'EXDATE:20240215',
      ];
      const untilDate = new Date('2024-03-15T23:59:59.000Z');

      const result = updateRecurrenceWithUntil(recurrence, untilDate);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('RRULE:FREQ=DAILY;UNTIL=20240315T235959Z');
      expect(result[1]).toBe('EXDATE:20240215');
    });

    it('should handle multiple RRULEs', () => {
      const recurrence = [
        'RRULE:FREQ=WEEKLY;BYDAY=MO',
        'RRULE:FREQ=MONTHLY',
      ];
      const untilDate = new Date('2024-06-01T23:59:59.000Z');

      const result = updateRecurrenceWithUntil(recurrence, untilDate);

      expect(result[0]).toContain('UNTIL=20240601T235959Z');
      expect(result[1]).toContain('UNTIL=20240601T235959Z');
    });

    it('should return empty array for empty input', () => {
      const result = updateRecurrenceWithUntil([], new Date());

      expect(result).toEqual([]);
    });
  });

  describe('isRRule', () => {
    it('should return true for RRULE strings', () => {
      expect(isRRule('RRULE:FREQ=DAILY')).toBe(true);
      expect(isRRule('RRULE:FREQ=WEEKLY;INTERVAL=2')).toBe(true);
    });

    it('should return false for non-RRULE strings', () => {
      expect(isRRule('EXDATE:20240215')).toBe(false);
      expect(isRRule('RDATE:20240301')).toBe(false);
      expect(isRRule('DTSTART:20240101')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isRRule('')).toBe(false);
    });
  });

  describe('extractFrequency', () => {
    it('should extract DAILY frequency', () => {
      expect(extractFrequency('RRULE:FREQ=DAILY')).toBe('DAILY');
    });

    it('should extract WEEKLY frequency', () => {
      expect(extractFrequency('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')).toBe('WEEKLY');
    });

    it('should extract MONTHLY frequency', () => {
      expect(extractFrequency('RRULE:FREQ=MONTHLY;BYMONTHDAY=15')).toBe('MONTHLY');
    });

    it('should extract YEARLY frequency', () => {
      expect(extractFrequency('RRULE:FREQ=YEARLY')).toBe('YEARLY');
    });

    it('should return null for strings without FREQ', () => {
      expect(extractFrequency('EXDATE:20240215')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractFrequency('')).toBeNull();
    });
  });

  describe('hasRecurrenceRule', () => {
    it('should return true when array contains RRULE', () => {
      expect(hasRecurrenceRule(['RRULE:FREQ=DAILY'])).toBe(true);
      expect(hasRecurrenceRule(['EXDATE:20240215', 'RRULE:FREQ=WEEKLY'])).toBe(true);
    });

    it('should return false when array has no RRULE', () => {
      expect(hasRecurrenceRule(['EXDATE:20240215'])).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(hasRecurrenceRule([])).toBe(false);
    });

    it('should return false for null', () => {
      expect(hasRecurrenceRule(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasRecurrenceRule(undefined)).toBe(false);
    });
  });
});

