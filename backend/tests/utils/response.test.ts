import { describe, it, expect } from 'vitest';
import type { calendar_v3 } from 'googleapis';
import {
  successResponse,
  mapCalendarToResponse,
  mapCalendarsToResponse,
  mapUserInfoToResponse,
  mapCalendarWithPermissions,
} from '../../src/utils/response.js';

describe('response utils', () => {
  describe('successResponse', () => {
    it('should create success response without data', () => {
      const response = successResponse();

      expect(response.success).toBe(true);
    });

    it('should create success response with data', () => {
      const response = successResponse({ eventId: '123', created: true });

      expect(response.success).toBe(true);
      expect(response.eventId).toBe('123');
      expect(response.created).toBe(true);
    });
  });

  describe('mapCalendarToResponse', () => {
    it('should map all calendar properties', () => {
      const calendar: calendar_v3.Schema$CalendarListEntry = {
        id: 'cal-123',
        summary: 'Work Calendar',
        primary: true,
        backgroundColor: '#4285f4',
        accessRole: 'owner',
      };

      const result = mapCalendarToResponse(calendar);

      expect(result).toEqual({
        id: 'cal-123',
        name: 'Work Calendar',
        primary: true,
        backgroundColor: '#4285f4',
        accessRole: 'owner',
      });
    });

    it('should handle null/undefined values', () => {
      const calendar: calendar_v3.Schema$CalendarListEntry = {
        id: 'cal-123',
        summary: null,
        primary: undefined,
        backgroundColor: null,
        accessRole: undefined,
      };

      const result = mapCalendarToResponse(calendar);

      expect(result.id).toBe('cal-123');
      expect(result.name).toBeNull();
      expect(result.primary).toBeUndefined();
    });
  });

  describe('mapCalendarsToResponse', () => {
    it('should map array of calendars', () => {
      const calendars: calendar_v3.Schema$CalendarListEntry[] = [
        { id: 'cal-1', summary: 'Calendar 1', primary: true, backgroundColor: '#ff0000', accessRole: 'owner' },
        { id: 'cal-2', summary: 'Calendar 2', primary: false, backgroundColor: '#00ff00', accessRole: 'reader' },
      ];

      const result = mapCalendarsToResponse(calendars);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('cal-1');
      expect(result[1].id).toBe('cal-2');
    });

    it('should return empty array for empty input', () => {
      const result = mapCalendarsToResponse([]);

      expect(result).toEqual([]);
    });
  });

  describe('mapUserInfoToResponse', () => {
    it('should map all user info properties', () => {
      const userInfo = {
        email: 'user@example.com',
        name: 'John Doe',
        picture: 'https://example.com/photo.jpg',
      };

      const result = mapUserInfoToResponse(userInfo);

      expect(result).toEqual({
        email: 'user@example.com',
        name: 'John Doe',
        picture: 'https://example.com/photo.jpg',
      });
    });

    it('should handle missing properties', () => {
      const userInfo = {
        email: 'user@example.com',
      };

      const result = mapUserInfoToResponse(userInfo);

      expect(result.email).toBe('user@example.com');
      expect(result.name).toBeUndefined();
      expect(result.picture).toBeUndefined();
    });

    it('should handle null values', () => {
      const userInfo = {
        email: null,
        name: null,
        picture: null,
      };

      const result = mapUserInfoToResponse(userInfo);

      expect(result.email).toBeNull();
      expect(result.name).toBeNull();
      expect(result.picture).toBeNull();
    });
  });

  describe('mapCalendarWithPermissions', () => {
    it('should map calendar with permissions', () => {
      const calendar = { id: 'cal-123', name: 'Work', color: '#4285f4' };
      const permissions = ['read', 'create', 'update', 'delete'];

      const result = mapCalendarWithPermissions(calendar, permissions);

      expect(result).toEqual({
        id: 'cal-123',
        name: 'Work',
        color: '#4285f4',
        permissions: ['read', 'create', 'update', 'delete'],
      });
    });

    it('should handle empty permissions', () => {
      const calendar = { id: 'cal-123', name: 'Work', color: '#4285f4' };
      const permissions: string[] = [];

      const result = mapCalendarWithPermissions(calendar, permissions);

      expect(result.permissions).toEqual([]);
    });
  });
});

