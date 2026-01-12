import { describe, it, expect } from 'vitest';
import {
  getWeekDays,
  formatWeekHeader,
  formatDayHeader,
  formatDayShort,
  formatDayNumber,
  formatTime,
  formatDateFull,
  isToday,
  isSameDay,
  addDays,
  getWeekNumber,
  calculateEventDuration,
  preserveTimeOnNewDate,
  createAllDayEventTimes,
  createTimedEventTimes,
  createDateWithTime,
} from '@/utils/dateUtils';

describe('dateUtils', () => {
  describe('getWeekDays', () => {
    it('returns 7 days starting from Monday', () => {
      const date = new Date(2024, 5, 12); // Wednesday, June 12, 2024
      const weekDays = getWeekDays(date);

      expect(weekDays).toHaveLength(7);
      expect(weekDays[0].getDay()).toBe(1); // Monday
      expect(weekDays[6].getDay()).toBe(0); // Sunday
    });

    it('returns same week for any day in that week', () => {
      const wednesday = new Date(2024, 5, 12);
      const friday = new Date(2024, 5, 14);

      const weekFromWednesday = getWeekDays(wednesday);
      const weekFromFriday = getWeekDays(friday);

      expect(weekFromWednesday[0].getTime()).toBe(weekFromFriday[0].getTime());
    });
  });

  describe('formatWeekHeader', () => {
    it('formats week within same month', () => {
      const date = new Date(2024, 5, 12); // June 12, 2024
      const header = formatWeekHeader(date);

      expect(header).toContain('juni');
      expect(header).toContain('2024');
    });

    it('formats week spanning two months', () => {
      const date = new Date(2024, 5, 30); // End of June 2024
      const header = formatWeekHeader(date);

      // Should include both months
      expect(header).toMatch(/juni|juli/);
    });
  });

  describe('formatDayHeader', () => {
    it('formats day with weekday and date', () => {
      const date = new Date(2024, 5, 12); // Wednesday, June 12
      const header = formatDayHeader(date);

      expect(header).toContain('12');
      expect(header).toContain('6');
    });
  });

  describe('formatDayShort', () => {
    it('returns shortened weekday name', () => {
      const date = new Date(2024, 5, 12); // Wednesday
      const short = formatDayShort(date);

      expect(short).toHaveLength(3);
    });
  });

  describe('formatDayNumber', () => {
    it('returns day of month', () => {
      const date = new Date(2024, 5, 12);
      expect(formatDayNumber(date)).toBe('12');
    });

    it('handles single digit days', () => {
      const date = new Date(2024, 5, 5);
      expect(formatDayNumber(date)).toBe('5');
    });
  });

  describe('formatTime', () => {
    it('formats time as HH:mm', () => {
      const date = new Date(2024, 5, 12, 14, 30);
      expect(formatTime(date)).toBe('14:30');
    });

    it('pads single digit hours and minutes', () => {
      const date = new Date(2024, 5, 12, 9, 5);
      expect(formatTime(date)).toBe('09:05');
    });
  });

  describe('formatDateFull', () => {
    it('formats full date in Swedish', () => {
      const date = new Date(2024, 5, 12);
      const formatted = formatDateFull(date);

      expect(formatted).toContain('12');
      expect(formatted).toContain('2024');
    });
  });

  describe('isToday', () => {
    it('returns true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('isSameDay', () => {
    it('returns true for same day different times', () => {
      const date1 = new Date(2024, 5, 12, 9, 0);
      const date2 = new Date(2024, 5, 12, 14, 30);
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('returns false for different days', () => {
      const date1 = new Date(2024, 5, 12);
      const date2 = new Date(2024, 5, 13);
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('adds days correctly', () => {
      const date = new Date(2024, 5, 12);
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(17);
    });

    it('handles month boundary', () => {
      const date = new Date(2024, 5, 30);
      const result = addDays(date, 2);
      expect(result.getMonth()).toBe(6); // July
      expect(result.getDate()).toBe(2);
    });
  });

  describe('getWeekNumber', () => {
    it('returns correct week number', () => {
      const date = new Date(2024, 0, 1); // Jan 1, 2024
      const weekNum = getWeekNumber(date);
      expect(typeof weekNum).toBe('number');
      expect(weekNum).toBeGreaterThanOrEqual(1);
      expect(weekNum).toBeLessThanOrEqual(53);
    });
  });

  describe('calculateEventDuration', () => {
    it('calculates duration in milliseconds', () => {
      const start = new Date(2024, 5, 12, 9, 0);
      const end = new Date(2024, 5, 12, 10, 0);
      const duration = calculateEventDuration(start, end);
      expect(duration).toBe(60 * 60 * 1000); // 1 hour in ms
    });

    it('handles multi-day events', () => {
      const start = new Date(2024, 5, 12, 9, 0);
      const end = new Date(2024, 5, 13, 9, 0);
      const duration = calculateEventDuration(start, end);
      expect(duration).toBe(24 * 60 * 60 * 1000); // 24 hours in ms
    });
  });

  describe('preserveTimeOnNewDate', () => {
    it('preserves time from original date on new date', () => {
      const original = new Date(2024, 5, 12, 14, 30, 45);
      const newDate = new Date(2024, 6, 20);

      const result = preserveTimeOnNewDate(original, newDate);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(6); // July
      expect(result.getDate()).toBe(20);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
      expect(result.getSeconds()).toBe(45);
    });
  });

  describe('createAllDayEventTimes', () => {
    it('creates midnight to midnight times', () => {
      const date = new Date(2024, 5, 12, 14, 30); // Random time
      const { startTime, endTime } = createAllDayEventTimes(date);

      expect(startTime.getHours()).toBe(0);
      expect(startTime.getMinutes()).toBe(0);
      expect(startTime.getSeconds()).toBe(0);
      expect(startTime.getDate()).toBe(12);

      expect(endTime.getHours()).toBe(0);
      expect(endTime.getMinutes()).toBe(0);
      expect(endTime.getDate()).toBe(13); // Next day
    });
  });

  describe('createTimedEventTimes', () => {
    it('creates event at specified time with duration', () => {
      const date = new Date(2024, 5, 12);
      const durationMs = 60 * 60 * 1000; // 1 hour

      const { startTime, endTime } = createTimedEventTimes(date, 9, 30, durationMs);

      expect(startTime.getHours()).toBe(9);
      expect(startTime.getMinutes()).toBe(30);
      expect(endTime.getHours()).toBe(10);
      expect(endTime.getMinutes()).toBe(30);
    });
  });

  describe('createDateWithTime', () => {
    it('creates date at specified time', () => {
      const date = new Date(2024, 5, 12, 14, 30);
      const result = createDateWithTime(date, 9, 15);

      expect(result.getDate()).toBe(12);
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(15);
      expect(result.getSeconds()).toBe(0);
    });
  });
});

