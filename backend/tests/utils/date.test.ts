import { describe, it, expect } from 'vitest';
import {
  toISOString,
  isValidDate,
  getPreviousDayEnd,
  getPreviousDayEndUTC,
  calculateUntilDate,
  formatDateForRRule,
  getDateOnly,
  buildEventDatetime,
} from '../../src/utils/date.js';

describe('date utils', () => {
  describe('toISOString', () => {
    it('should convert date string to ISO format', () => {
      const result = toISOString('2024-01-15T10:30:00Z');

      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle date-only strings', () => {
      const result = toISOString('2024-01-15');

      expect(result).toContain('2024-01-15');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid ISO date', () => {
      expect(isValidDate('2024-01-15T10:30:00Z')).toBe(true);
    });

    it('should return true for valid date-only string', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
    });

    it('should return false for invalid date', () => {
      expect(isValidDate('not-a-date')).toBe(false);
    });

    it('should return false for invalid format', () => {
      expect(isValidDate('2024-13-45')).toBe(false);
    });
  });

  describe('getPreviousDayEnd', () => {
    it('should return previous day at 23:59:59', () => {
      const result = getPreviousDayEnd('2024-01-15T10:30:00Z');

      expect(result.getDate()).toBe(14);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });

    it('should handle month boundary', () => {
      const result = getPreviousDayEnd('2024-02-01T10:00:00Z');

      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(31);
    });

    it('should handle year boundary', () => {
      const result = getPreviousDayEnd('2024-01-01T10:00:00Z');

      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getDate()).toBe(31);
    });
  });

  describe('getPreviousDayEndUTC', () => {
    it('should return previous day at 23:59:59 UTC for date string', () => {
      const result = getPreviousDayEndUTC('2024-01-15');

      expect(result.getUTCDate()).toBe(14);
      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
    });

    it('should handle datetime string by extracting date part', () => {
      const result = getPreviousDayEndUTC('2024-01-15T10:30:00Z');

      expect(result.getUTCDate()).toBe(14);
    });
  });

  describe('calculateUntilDate', () => {
    it('should call getPreviousDayEndUTC for all-day events', () => {
      const result = calculateUntilDate('2024-01-15', true);

      expect(result.getUTCDate()).toBe(14);
      expect(result.getUTCHours()).toBe(23);
    });

    it('should call getPreviousDayEnd for timed events', () => {
      const result = calculateUntilDate('2024-01-15T10:30:00Z', false);

      expect(result.getDate()).toBe(14);
      expect(result.getHours()).toBe(23);
    });
  });

  describe('formatDateForRRule', () => {
    it('should format date as RRULE UNTIL string', () => {
      const date = new Date('2024-01-15T23:59:59.000Z');

      const result = formatDateForRRule(date);

      expect(result).toBe('20240115T235959Z');
    });

    it('should not include milliseconds', () => {
      const date = new Date('2024-01-15T10:30:45.123Z');

      const result = formatDateForRRule(date);

      expect(result).not.toContain('123');
      expect(result).toBe('20240115T103045Z');
    });
  });

  describe('getDateOnly', () => {
    it('should extract date part from datetime string', () => {
      const result = getDateOnly('2024-01-15T10:30:00Z');

      expect(result).toBe('2024-01-15');
    });

    it('should return date-only string as is', () => {
      const result = getDateOnly('2024-01-15');

      expect(result).toBe('2024-01-15');
    });
  });

  describe('buildEventDatetime', () => {
    it('should build date-only object for all-day events', () => {
      const result = buildEventDatetime('2024-01-15T10:30:00Z', true);

      expect(result).toEqual({ date: '2024-01-15' });
      expect(result.dateTime).toBeUndefined();
    });

    it('should build dateTime object with timezone for timed events', () => {
      const result = buildEventDatetime('2024-01-15T10:30:00Z', false);

      expect(result).toEqual({
        dateTime: '2024-01-15T10:30:00Z',
        timeZone: 'Europe/Stockholm',
      });
      expect(result.date).toBeUndefined();
    });

    it('should use custom timezone when provided', () => {
      const result = buildEventDatetime('2024-01-15T10:30:00Z', false, 'America/New_York');

      expect(result.timeZone).toBe('America/New_York');
    });
  });
});

