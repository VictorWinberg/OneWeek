import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { calendar_v3 } from 'googleapis';

// Mock googleapis before importing calendarService
vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({})),
    },
    calendar: vi.fn().mockReturnValue({
      calendarList: { list: vi.fn() },
      events: {
        list: vi.fn(),
        get: vi.fn(),
        insert: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      },
    }),
  },
}));

// Import after mocking
import { normalizeEventToBlock, blockToGoogleEvent } from '../../src/services/calendarService.js';

describe('calendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeEventToBlock', () => {
    const calendarId = 'test-calendar-id';

    it('should convert a timed event to Block format', () => {
      const event: calendar_v3.Schema$Event = {
        id: 'event-123',
        summary: 'Team Meeting',
        description: 'Weekly sync',
        start: { dateTime: '2025-01-15T10:00:00+01:00' },
        end: { dateTime: '2025-01-15T11:00:00+01:00' },
      };

      const block = normalizeEventToBlock(event, calendarId);

      expect(block).toEqual({
        id: 'event-123',
        calendarId: 'test-calendar-id',
        title: 'Team Meeting',
        description: 'Weekly sync',
        startTime: '2025-01-15T10:00:00+01:00',
        endTime: '2025-01-15T11:00:00+01:00',
        allDay: false,
        metadata: {
          category: undefined,
          originalCalendarId: undefined,
        },
        recurrence: undefined,
        recurringEventId: undefined,
      });
    });

    it('should convert an all-day event to Block format', () => {
      const event: calendar_v3.Schema$Event = {
        id: 'event-456',
        summary: 'Holiday',
        start: { date: '2025-01-20' },
        end: { date: '2025-01-21' },
      };

      const block = normalizeEventToBlock(event, calendarId);

      expect(block.allDay).toBe(true);
      expect(block.startTime).toBe('2025-01-20');
      expect(block.endTime).toBe('2025-01-21');
    });

    it('should handle event without summary', () => {
      const event: calendar_v3.Schema$Event = {
        id: 'event-789',
        start: { dateTime: '2025-01-15T10:00:00+01:00' },
        end: { dateTime: '2025-01-15T11:00:00+01:00' },
      };

      const block = normalizeEventToBlock(event, calendarId);

      expect(block.title).toBe('Untitled');
    });

    it('should preserve extended properties metadata', () => {
      const event: calendar_v3.Schema$Event = {
        id: 'event-meta',
        summary: 'Moved Event',
        start: { dateTime: '2025-01-15T10:00:00+01:00' },
        end: { dateTime: '2025-01-15T11:00:00+01:00' },
        extendedProperties: {
          private: {
            category: 'work',
            originalCalendarId: 'original-cal-id',
          },
        },
      };

      const block = normalizeEventToBlock(event, calendarId);

      expect(block.metadata).toEqual({
        category: 'work',
        originalCalendarId: 'original-cal-id',
      });
    });

    it('should preserve recurrence information', () => {
      const event: calendar_v3.Schema$Event = {
        id: 'event-recurring',
        summary: 'Weekly Standup',
        start: { dateTime: '2025-01-15T09:00:00+01:00' },
        end: { dateTime: '2025-01-15T09:30:00+01:00' },
        recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'],
      };

      const block = normalizeEventToBlock(event, calendarId);

      expect(block.recurrence).toEqual(['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR']);
    });

    it('should include recurringEventId for event instances', () => {
      const event: calendar_v3.Schema$Event = {
        id: 'event-instance_20250115T090000Z',
        summary: 'Weekly Standup',
        start: { dateTime: '2025-01-15T09:00:00+01:00' },
        end: { dateTime: '2025-01-15T09:30:00+01:00' },
        recurringEventId: 'event-instance',
      };

      const block = normalizeEventToBlock(event, calendarId);

      expect(block.recurringEventId).toBe('event-instance');
    });

    it('should handle missing event id', () => {
      const event: calendar_v3.Schema$Event = {
        summary: 'No ID Event',
        start: { dateTime: '2025-01-15T10:00:00+01:00' },
        end: { dateTime: '2025-01-15T11:00:00+01:00' },
      };

      const block = normalizeEventToBlock(event, calendarId);

      expect(block.id).toBe('');
    });
  });

  describe('blockToGoogleEvent', () => {
    it('should convert timed event data to Google Calendar format', () => {
      const googleEvent = blockToGoogleEvent(
        'Team Meeting',
        'Weekly sync',
        '2025-01-15T10:00:00+01:00',
        '2025-01-15T11:00:00+01:00',
        false
      );

      expect(googleEvent).toEqual({
        summary: 'Team Meeting',
        description: 'Weekly sync',
        start: { dateTime: '2025-01-15T10:00:00+01:00', timeZone: 'Europe/Stockholm' },
        end: { dateTime: '2025-01-15T11:00:00+01:00', timeZone: 'Europe/Stockholm' },
      });
    });

    it('should convert all-day event data to Google Calendar format', () => {
      const googleEvent = blockToGoogleEvent(
        'Holiday',
        undefined,
        '2025-01-20T00:00:00+01:00',
        '2025-01-21T00:00:00+01:00',
        true
      );

      expect(googleEvent).toEqual({
        summary: 'Holiday',
        description: undefined,
        start: { date: '2025-01-20' },
        end: { date: '2025-01-21' },
      });
    });

    it('should include metadata as extended properties', () => {
      const googleEvent = blockToGoogleEvent(
        'Work Event',
        'Description',
        '2025-01-15T10:00:00+01:00',
        '2025-01-15T11:00:00+01:00',
        false,
        { category: 'work', originalCalendarId: 'original-cal' }
      );

      expect(googleEvent.extendedProperties).toEqual({
        private: {
          category: 'work',
          originalCalendarId: 'original-cal',
        },
      });
    });

    it('should not include undefined metadata values', () => {
      const googleEvent = blockToGoogleEvent(
        'Event',
        undefined,
        '2025-01-15T10:00:00+01:00',
        '2025-01-15T11:00:00+01:00',
        false,
        { category: undefined, originalCalendarId: 'original-cal' }
      );

      expect(googleEvent.extendedProperties?.private).toEqual({
        originalCalendarId: 'original-cal',
      });
    });

    it('should include recurrence rules when provided', () => {
      const googleEvent = blockToGoogleEvent(
        'Weekly Meeting',
        'Recurring event',
        '2025-01-15T10:00:00+01:00',
        '2025-01-15T11:00:00+01:00',
        false,
        undefined,
        ['RRULE:FREQ=WEEKLY;BYDAY=MO']
      );

      expect(googleEvent.recurrence).toEqual(['RRULE:FREQ=WEEKLY;BYDAY=MO']);
    });

    it('should not include recurrence when array is empty', () => {
      const googleEvent = blockToGoogleEvent(
        'Single Event',
        undefined,
        '2025-01-15T10:00:00+01:00',
        '2025-01-15T11:00:00+01:00',
        false,
        undefined,
        []
      );

      expect(googleEvent.recurrence).toBeUndefined();
    });

    it('should handle empty description', () => {
      const googleEvent = blockToGoogleEvent(
        'Event',
        '',
        '2025-01-15T10:00:00+01:00',
        '2025-01-15T11:00:00+01:00',
        false
      );

      expect(googleEvent.description).toBeUndefined();
    });
  });
});

