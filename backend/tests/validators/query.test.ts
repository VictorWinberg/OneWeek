import { describe, it, expect } from 'vitest';
import {
  validateListEventsQuery,
  validateRedirectUrl,
  validateAuthCode,
} from '../../src/validators/query.js';

describe('query validators', () => {
  describe('validateListEventsQuery', () => {
    it('should validate complete query parameters', () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        calendars: JSON.stringify([
          { id: 'cal-1', name: 'Work' },
          { id: 'cal-2', name: 'Personal' },
        ]),
      };

      const result = validateListEventsQuery(query);

      expect(result.startDate).toContain('2024-01-01');
      expect(result.endDate).toContain('2024-01-31');
      expect(result.calendars).toHaveLength(2);
      expect(result.calendars[0].id).toBe('cal-1');
    });

    it('should convert dates to ISO strings', () => {
      const query = {
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-22T18:00:00Z',
        calendars: '[]',
      };

      const result = validateListEventsQuery(query);

      expect(result.startDate).toBe('2024-01-15T10:00:00.000Z');
      expect(result.endDate).toBe('2024-01-22T18:00:00.000Z');
    });

    it('should throw ValidationError when startDate is missing', () => {
      const query = {
        endDate: '2024-01-31',
        calendars: '[]',
      };

      expect(() => validateListEventsQuery(query)).toThrow('Missing required parameter: startDate');
    });

    it('should throw ValidationError when endDate is missing', () => {
      const query = {
        startDate: '2024-01-01',
        calendars: '[]',
      };

      expect(() => validateListEventsQuery(query)).toThrow('Missing required parameter: endDate');
    });

    it('should throw ValidationError when calendars is missing', () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      expect(() => validateListEventsQuery(query)).toThrow('Missing required parameter: calendars');
    });

    it('should throw ValidationError for invalid startDate format', () => {
      const query = {
        startDate: 'not-a-date',
        endDate: '2024-01-31',
        calendars: '[]',
      };

      expect(() => validateListEventsQuery(query)).toThrow('Invalid startDate format');
    });

    it('should throw ValidationError for invalid endDate format', () => {
      const query = {
        startDate: '2024-01-01',
        endDate: 'invalid',
        calendars: '[]',
      };

      expect(() => validateListEventsQuery(query)).toThrow('Invalid endDate format');
    });

    it('should throw ValidationError for invalid calendars JSON', () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        calendars: 'not valid json',
      };

      expect(() => validateListEventsQuery(query)).toThrow('Invalid calendars JSON format');
    });

    it('should throw ValidationError when calendars is not an array', () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        calendars: '{"id": "cal-1"}',
      };

      expect(() => validateListEventsQuery(query)).toThrow('calendars must be an array');
    });

    it('should handle empty calendars array', () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        calendars: '[]',
      };

      const result = validateListEventsQuery(query);

      expect(result.calendars).toEqual([]);
    });
  });

  describe('validateRedirectUrl', () => {
    it('should return valid redirect URL', () => {
      const query = { redirect_url: 'https://example.com/callback' };

      const result = validateRedirectUrl(query);

      expect(result).toBe('https://example.com/callback');
    });

    it('should accept relative URLs', () => {
      const query = { redirect_url: '/dashboard' };

      const result = validateRedirectUrl(query);

      expect(result).toBe('/dashboard');
    });

    it('should throw ValidationError when redirect_url is missing', () => {
      const query = {};

      expect(() => validateRedirectUrl(query)).toThrow('redirect_url query parameter is required');
    });

    it('should throw ValidationError when redirect_url is not a string', () => {
      const query = { redirect_url: 123 };

      expect(() => validateRedirectUrl(query)).toThrow('redirect_url query parameter is required');
    });

    it('should throw ValidationError when redirect_url is empty', () => {
      const query = { redirect_url: '' };

      expect(() => validateRedirectUrl(query)).toThrow('redirect_url query parameter is required');
    });
  });

  describe('validateAuthCode', () => {
    it('should return valid authorization code', () => {
      const query = { code: 'auth-code-123' };

      const result = validateAuthCode(query);

      expect(result).toBe('auth-code-123');
    });

    it('should throw ValidationError when code is missing', () => {
      const query = {};

      expect(() => validateAuthCode(query)).toThrow('Missing authorization code');
    });

    it('should throw ValidationError when code is not a string', () => {
      const query = { code: 456 };

      expect(() => validateAuthCode(query)).toThrow('Missing authorization code');
    });

    it('should throw ValidationError when code is empty', () => {
      const query = { code: '' };

      expect(() => validateAuthCode(query)).toThrow('Missing authorization code');
    });
  });
});

