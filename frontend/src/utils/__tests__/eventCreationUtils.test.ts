import { describe, it, expect } from 'vitest';
import {
  getDefaultCalendarId,
  createEventDateTime,
  createAllDayEndDateTime,
  validateEventTimes,
  prepareEventData,
} from '@/utils/eventCreationUtils';
import type { Calendar } from '@/types/calendar';

describe('eventCreationUtils', () => {
  const mockCalendars: Calendar[] = [
    { id: 'cal1@example.com', name: 'Calendar 1', color: '#ff0000' },
    { id: 'user@example.com', name: 'User Calendar', color: '#00ff00' },
    { id: 'cal2@example.com', name: 'Calendar 2', color: '#0000ff' },
  ];

  describe('getDefaultCalendarId', () => {
    it('returns defaultCalendarId when provided', () => {
      const result = getDefaultCalendarId(
        mockCalendars,
        { email: 'user@example.com' },
        'cal2@example.com'
      );
      expect(result).toBe('cal2@example.com');
    });

    it('returns user email calendar when no default provided', () => {
      const result = getDefaultCalendarId(mockCalendars, { email: 'user@example.com' });
      expect(result).toBe('user@example.com');
    });

    it('returns first calendar when user email not in calendars', () => {
      const result = getDefaultCalendarId(mockCalendars, { email: 'other@example.com' });
      expect(result).toBe('cal1@example.com');
    });

    it('returns first calendar when user is null', () => {
      const result = getDefaultCalendarId(mockCalendars, null);
      expect(result).toBe('cal1@example.com');
    });

    it('returns empty string when no calendars available', () => {
      const result = getDefaultCalendarId([], null);
      expect(result).toBe('');
    });
  });

  describe('createEventDateTime', () => {
    it('creates timed event with correct time', () => {
      const date = new Date(2024, 5, 12, 14, 30); // Random time
      const result = createEventDateTime(date, '09:30', false);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(12);
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(30);
    });

    it('creates all-day event at midnight', () => {
      const date = new Date(2024, 5, 12, 14, 30); // Random time
      const result = createEventDateTime(date, '09:30', true);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe('createAllDayEndDateTime', () => {
    it('creates end of day datetime', () => {
      const date = new Date(2024, 5, 12);
      const result = createAllDayEndDateTime(date);

      expect(result.getDate()).toBe(12);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });
  });

  describe('validateEventTimes', () => {
    it('returns null for valid timed event', () => {
      const start = new Date(2024, 5, 12, 9, 0);
      const end = new Date(2024, 5, 12, 10, 0);
      const result = validateEventTimes(start, end, false);

      expect(result).toBeNull();
    });

    it('returns error when end is before start for timed event', () => {
      const start = new Date(2024, 5, 12, 10, 0);
      const end = new Date(2024, 5, 12, 9, 0);
      const result = validateEventTimes(start, end, false);

      expect(result).toBe('Sluttid måste vara efter starttid');
    });

    it('returns error when end equals start for timed event', () => {
      const start = new Date(2024, 5, 12, 10, 0);
      const end = new Date(2024, 5, 12, 10, 0);
      const result = validateEventTimes(start, end, false);

      expect(result).toBe('Sluttid måste vara efter starttid');
    });

    it('skips validation for all-day events', () => {
      const start = new Date(2024, 5, 12, 10, 0);
      const end = new Date(2024, 5, 12, 9, 0); // End before start
      const result = validateEventTimes(start, end, true);

      expect(result).toBeNull();
    });
  });

  describe('prepareEventData', () => {
    it('prepares valid timed event data', () => {
      const startDate = new Date(2024, 5, 12);
      const endDate = new Date(2024, 5, 12);
      const result = prepareEventData(startDate, endDate, '09:00', '10:00', false);

      expect(result.startDateTime.getHours()).toBe(9);
      expect(result.endDateTime.getHours()).toBe(10);
      expect(result.validationError).toBeNull();
    });

    it('prepares all-day event data', () => {
      const startDate = new Date(2024, 5, 12);
      const endDate = new Date(2024, 5, 12);
      const result = prepareEventData(startDate, endDate, '09:00', '10:00', true);

      expect(result.startDateTime.getHours()).toBe(0);
      expect(result.endDateTime.getHours()).toBe(23);
      expect(result.validationError).toBeNull();
    });

    it('returns validation error for invalid times', () => {
      const startDate = new Date(2024, 5, 12);
      const endDate = new Date(2024, 5, 12);
      const result = prepareEventData(startDate, endDate, '10:00', '09:00', false);

      expect(result.validationError).toBe('Sluttid måste vara efter starttid');
    });
  });
});

