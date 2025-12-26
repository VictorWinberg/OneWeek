import { describe, it, expect } from 'vitest';
import {
  validateCreateEventBody,
  validateUpdateEventBody,
  validateMoveEventBody,
  validateRecurrenceRule,
} from '../../src/validators/events.js';

describe('events validators', () => {
  describe('validateCreateEventBody', () => {
    it('should validate complete event body', () => {
      const body = {
        calendarId: 'cal-123',
        title: 'Meeting',
        description: 'Team meeting',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        allDay: false,
        metadata: { category: 'work' },
      };

      const result = validateCreateEventBody(body);

      expect(result.calendarId).toBe('cal-123');
      expect(result.title).toBe('Meeting');
      expect(result.description).toBe('Team meeting');
      expect(result.startTime).toBe('2024-01-15T10:00:00Z');
      expect(result.endTime).toBe('2024-01-15T11:00:00Z');
      expect(result.allDay).toBe(false);
      expect(result.metadata).toEqual({ category: 'work' });
    });

    it('should validate minimal required fields', () => {
      const body = {
        calendarId: 'cal-123',
        title: 'Event',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
      };

      const result = validateCreateEventBody(body);

      expect(result.calendarId).toBe('cal-123');
      expect(result.title).toBe('Event');
      expect(result.description).toBeUndefined();
      expect(result.allDay).toBe(false);
    });

    it('should throw ValidationError when calendarId is missing', () => {
      const body = {
        title: 'Event',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
      };

      expect(() => validateCreateEventBody(body)).toThrow('Missing required field: calendarId');
    });

    it('should throw ValidationError when title is missing', () => {
      const body = {
        calendarId: 'cal-123',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
      };

      expect(() => validateCreateEventBody(body)).toThrow('Missing required field: title');
    });

    it('should throw ValidationError when startTime is missing', () => {
      const body = {
        calendarId: 'cal-123',
        title: 'Event',
        endTime: '2024-01-15T11:00:00Z',
      };

      expect(() => validateCreateEventBody(body)).toThrow('Missing required field: startTime');
    });

    it('should throw ValidationError when endTime is missing', () => {
      const body = {
        calendarId: 'cal-123',
        title: 'Event',
        startTime: '2024-01-15T10:00:00Z',
      };

      expect(() => validateCreateEventBody(body)).toThrow('Missing required field: endTime');
    });

    it('should throw ValidationError when calendarId is not a string', () => {
      const body = {
        calendarId: 123,
        title: 'Event',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
      };

      expect(() => validateCreateEventBody(body)).toThrow('Missing required field: calendarId');
    });

    it('should handle recurrenceRule', () => {
      const body = {
        calendarId: 'cal-123',
        title: 'Daily Standup',
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T09:15:00Z',
        recurrenceRule: { frequency: 'DAILY' },
      };

      const result = validateCreateEventBody(body);

      expect(result.recurrenceRule).toEqual({ frequency: 'DAILY' });
    });
  });

  describe('validateUpdateEventBody', () => {
    it('should validate partial update with title only', () => {
      const body = { title: 'Updated Title' };

      const result = validateUpdateEventBody(body);

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBeUndefined();
    });

    it('should validate update with multiple fields', () => {
      const body = {
        title: 'New Title',
        description: 'New Description',
        startTime: '2024-01-20T14:00:00Z',
        endTime: '2024-01-20T15:00:00Z',
        allDay: true,
      };

      const result = validateUpdateEventBody(body);

      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New Description');
      expect(result.startTime).toBe('2024-01-20T14:00:00Z');
      expect(result.endTime).toBe('2024-01-20T15:00:00Z');
      expect(result.allDay).toBe(true);
    });

    it('should return empty object for empty body', () => {
      const body = {};

      const result = validateUpdateEventBody(body);

      expect(result).toEqual({});
    });

    it('should throw ValidationError when title is not a string', () => {
      const body = { title: 123 };

      expect(() => validateUpdateEventBody(body)).toThrow('title must be a string');
    });

    it('should throw ValidationError when description is not a string', () => {
      const body = { description: ['desc'] };

      expect(() => validateUpdateEventBody(body)).toThrow('description must be a string');
    });

    it('should throw ValidationError when allDay is not a boolean', () => {
      const body = { allDay: 'true' };

      expect(() => validateUpdateEventBody(body)).toThrow('allDay must be a boolean');
    });

    it('should handle null recurrenceRule (remove recurrence)', () => {
      const body = { recurrenceRule: null };

      const result = validateUpdateEventBody(body);

      expect(result.recurrenceRule).toBeNull();
    });

    it('should handle recurrenceRule object', () => {
      const body = { recurrenceRule: { frequency: 'WEEKLY', interval: 2 } };

      const result = validateUpdateEventBody(body);

      expect(result.recurrenceRule).toEqual({ frequency: 'WEEKLY', interval: 2 });
    });
  });

  describe('validateMoveEventBody', () => {
    it('should validate with valid targetCalendarId', () => {
      const body = { targetCalendarId: 'cal-456' };

      const result = validateMoveEventBody(body);

      expect(result.targetCalendarId).toBe('cal-456');
    });

    it('should throw ValidationError when targetCalendarId is missing', () => {
      const body = {};

      expect(() => validateMoveEventBody(body)).toThrow('Missing targetCalendarId');
    });

    it('should throw ValidationError when targetCalendarId is not a string', () => {
      const body = { targetCalendarId: 123 };

      expect(() => validateMoveEventBody(body)).toThrow('Missing targetCalendarId');
    });

    it('should throw ValidationError when targetCalendarId is empty', () => {
      const body = { targetCalendarId: '' };

      expect(() => validateMoveEventBody(body)).toThrow('Missing targetCalendarId');
    });
  });

  describe('validateRecurrenceRule', () => {
    it('should validate DAILY frequency', () => {
      const rule = { frequency: 'DAILY' };

      const result = validateRecurrenceRule(rule);

      expect(result.frequency).toBe('DAILY');
    });

    it('should validate WEEKLY frequency', () => {
      const rule = { frequency: 'WEEKLY', interval: 2 };

      const result = validateRecurrenceRule(rule);

      expect(result.frequency).toBe('WEEKLY');
      expect(result.interval).toBe(2);
    });

    it('should validate MONTHLY frequency', () => {
      const rule = { frequency: 'MONTHLY' };

      const result = validateRecurrenceRule(rule);

      expect(result.frequency).toBe('MONTHLY');
    });

    it('should validate YEARLY frequency', () => {
      const rule = { frequency: 'YEARLY' };

      const result = validateRecurrenceRule(rule);

      expect(result.frequency).toBe('YEARLY');
    });

    it('should throw ValidationError for null', () => {
      expect(() => validateRecurrenceRule(null)).toThrow('Invalid recurrence rule');
    });

    it('should throw ValidationError for non-object', () => {
      expect(() => validateRecurrenceRule('daily')).toThrow('Invalid recurrence rule');
    });

    it('should throw ValidationError for missing frequency', () => {
      const rule = { interval: 2 };

      expect(() => validateRecurrenceRule(rule)).toThrow('Invalid recurrence frequency');
    });

    it('should throw ValidationError for invalid frequency', () => {
      const rule = { frequency: 'HOURLY' };

      expect(() => validateRecurrenceRule(rule)).toThrow('Invalid recurrence frequency');
    });
  });
});

