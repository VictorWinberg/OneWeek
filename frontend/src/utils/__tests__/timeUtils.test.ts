import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  formatTimeString,
  parseTimeString,
  calculateSmartDefaultTimes,
  validateTimeRange,
  calculateEndTimeWithDuration,
  calculateNextHourTimeSlot,
} from '@/utils/timeUtils';

describe('timeUtils', () => {
  describe('timeToMinutes', () => {
    it('converts midnight to 0 minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0);
    });

    it('converts noon to 720 minutes', () => {
      expect(timeToMinutes('12:00')).toBe(720);
    });

    it('converts 23:59 to 1439 minutes', () => {
      expect(timeToMinutes('23:59')).toBe(1439);
    });

    it('handles time with minutes correctly', () => {
      expect(timeToMinutes('09:30')).toBe(570);
    });
  });

  describe('minutesToTime', () => {
    it('converts 0 minutes to 00:00', () => {
      expect(minutesToTime(0)).toBe('00:00');
    });

    it('converts 720 minutes to 12:00', () => {
      expect(minutesToTime(720)).toBe('12:00');
    });

    it('converts 1439 minutes to 23:59', () => {
      expect(minutesToTime(1439)).toBe('23:59');
    });

    it('wraps around after 24 hours', () => {
      expect(minutesToTime(1440)).toBe('00:00');
      expect(minutesToTime(1500)).toBe('01:00');
    });

    it('handles single digit hours and minutes with padding', () => {
      expect(minutesToTime(65)).toBe('01:05');
    });
  });

  describe('formatTimeString', () => {
    it('formats hour and minute with padding', () => {
      expect(formatTimeString(9, 5)).toBe('09:05');
    });

    it('formats double digit hour and minute', () => {
      expect(formatTimeString(14, 30)).toBe('14:30');
    });

    it('formats midnight', () => {
      expect(formatTimeString(0, 0)).toBe('00:00');
    });
  });

  describe('parseTimeString', () => {
    it('parses time string correctly', () => {
      expect(parseTimeString('09:30')).toEqual({ hour: 9, minute: 30 });
    });

    it('parses midnight', () => {
      expect(parseTimeString('00:00')).toEqual({ hour: 0, minute: 0 });
    });

    it('parses end of day', () => {
      expect(parseTimeString('23:59')).toEqual({ hour: 23, minute: 59 });
    });
  });

  describe('calculateSmartDefaultTimes', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns 09:00-10:00 for a future date', () => {
      vi.setSystemTime(new Date(2024, 5, 15, 10, 30));
      const futureDate = new Date(2024, 5, 20); // 5 days in future

      const result = calculateSmartDefaultTimes(futureDate);

      expect(result).toEqual({ startTime: '09:00', endTime: '10:00' });
    });

    it('returns next hour for today', () => {
      const now = new Date(2024, 5, 15, 10, 30);
      vi.setSystemTime(now);

      const result = calculateSmartDefaultTimes(now);

      expect(result).toEqual({ startTime: '11:00', endTime: '12:00' });
    });

    it('handles near midnight correctly', () => {
      const now = new Date(2024, 5, 15, 23, 30);
      vi.setSystemTime(now);

      const result = calculateSmartDefaultTimes(now);

      expect(result).toEqual({ startTime: '00:00', endTime: '01:00' });
    });
  });

  describe('validateTimeRange', () => {
    it('returns true when end is after start', () => {
      expect(validateTimeRange('09:00', '10:00')).toBe(true);
    });

    it('returns false when end equals start', () => {
      expect(validateTimeRange('09:00', '09:00')).toBe(false);
    });

    it('returns false when end is before start', () => {
      expect(validateTimeRange('10:00', '09:00')).toBe(false);
    });
  });

  describe('calculateEndTimeWithDuration', () => {
    it('maintains 1 hour duration when start changes', () => {
      const result = calculateEndTimeWithDuration('09:00', '10:00', '14:00');
      expect(result).toBe('15:00');
    });

    it('maintains 30 minute duration', () => {
      const result = calculateEndTimeWithDuration('09:00', '09:30', '14:00');
      expect(result).toBe('14:30');
    });

    it('handles duration spanning midnight', () => {
      const result = calculateEndTimeWithDuration('09:00', '10:00', '23:30');
      expect(result).toBe('00:30');
    });
  });

  describe('calculateNextHourTimeSlot', () => {
    it('returns 1 hour time slot', () => {
      const result = calculateNextHourTimeSlot(9, 0);
      expect(result).toEqual({ startTime: '09:00', endTime: '10:00' });
    });

    it('handles non-zero minutes', () => {
      const result = calculateNextHourTimeSlot(9, 30);
      expect(result).toEqual({ startTime: '09:30', endTime: '10:30' });
    });

    it('wraps around midnight', () => {
      const result = calculateNextHourTimeSlot(23, 0);
      expect(result).toEqual({ startTime: '23:00', endTime: '00:00' });
    });
  });
});

