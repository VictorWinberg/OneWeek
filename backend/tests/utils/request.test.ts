import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import {
  getRequiredQueryParam,
  getOptionalQueryParam,
  parseJsonQueryParam,
  parseDateQueryParam,
  getRequiredBodyField,
  validateRequiredFields,
  getUpdateMode,
} from '../../src/utils/request.js';

describe('request utils', () => {
  describe('getRequiredQueryParam', () => {
    it('should return value when param exists', () => {
      const mockReq = { query: { name: 'John' } } as unknown as Request;

      const result = getRequiredQueryParam(mockReq, 'name');

      expect(result).toBe('John');
    });

    it('should throw ValidationError when param is missing', () => {
      const mockReq = { query: {} } as unknown as Request;

      expect(() => getRequiredQueryParam(mockReq, 'name')).toThrow('Missing required parameter: name');
    });

    it('should throw ValidationError when param is not a string', () => {
      const mockReq = { query: { items: ['a', 'b'] } } as unknown as Request;

      expect(() => getRequiredQueryParam(mockReq, 'items')).toThrow('Missing required parameter: items');
    });
  });

  describe('getOptionalQueryParam', () => {
    it('should return value when param exists', () => {
      const mockReq = { query: { filter: 'active' } } as unknown as Request;

      const result = getOptionalQueryParam(mockReq, 'filter');

      expect(result).toBe('active');
    });

    it('should return undefined when param is missing', () => {
      const mockReq = { query: {} } as unknown as Request;

      const result = getOptionalQueryParam(mockReq, 'filter');

      expect(result).toBeUndefined();
    });

    it('should return undefined when param is not a string', () => {
      const mockReq = { query: { items: ['a', 'b'] } } as unknown as Request;

      const result = getOptionalQueryParam(mockReq, 'items');

      expect(result).toBeUndefined();
    });
  });

  describe('parseJsonQueryParam', () => {
    it('should parse valid JSON', () => {
      const mockReq = {
        query: { data: '{"name":"John","age":30}' },
      } as unknown as Request;

      const result = parseJsonQueryParam<{ name: string; age: number }>(mockReq, 'data');

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should parse JSON arrays', () => {
      const mockReq = {
        query: { ids: '[1, 2, 3]' },
      } as unknown as Request;

      const result = parseJsonQueryParam<number[]>(mockReq, 'ids');

      expect(result).toEqual([1, 2, 3]);
    });

    it('should throw ValidationError for invalid JSON', () => {
      const mockReq = {
        query: { data: 'not valid json' },
      } as unknown as Request;

      expect(() => parseJsonQueryParam(mockReq, 'data')).toThrow('Invalid JSON in parameter: data');
    });

    it('should throw ValidationError when param is missing', () => {
      const mockReq = { query: {} } as unknown as Request;

      expect(() => parseJsonQueryParam(mockReq, 'data')).toThrow('Missing required parameter: data');
    });
  });

  describe('parseDateQueryParam', () => {
    it('should parse valid date string', () => {
      const mockReq = {
        query: { date: '2024-01-15T10:30:00Z' },
      } as unknown as Request;

      const result = parseDateQueryParam(mockReq, 'date');

      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should parse date-only string', () => {
      const mockReq = {
        query: { date: '2024-01-15' },
      } as unknown as Request;

      const result = parseDateQueryParam(mockReq, 'date');

      expect(result).toContain('2024-01-15');
    });

    it('should throw ValidationError for invalid date', () => {
      const mockReq = {
        query: { date: 'not-a-date' },
      } as unknown as Request;

      expect(() => parseDateQueryParam(mockReq, 'date')).toThrow('Invalid date in parameter: date');
    });

    it('should throw ValidationError when param is missing', () => {
      const mockReq = { query: {} } as unknown as Request;

      expect(() => parseDateQueryParam(mockReq, 'date')).toThrow('Missing required parameter: date');
    });
  });

  describe('getRequiredBodyField', () => {
    it('should return value when field exists', () => {
      const body = { name: 'John', age: 30 };

      const result = getRequiredBodyField<string>(body, 'name');

      expect(result).toBe('John');
    });

    it('should throw ValidationError when field is missing', () => {
      const body = { name: 'John' };

      expect(() => getRequiredBodyField(body, 'email')).toThrow('Missing required field: email');
    });

    it('should throw ValidationError when field is null', () => {
      const body = { name: null };

      expect(() => getRequiredBodyField(body, 'name')).toThrow('Missing required field: name');
    });
  });

  describe('validateRequiredFields', () => {
    it('should not throw when all fields present', () => {
      const body = { name: 'John', email: 'john@example.com', age: 30 };

      expect(() => validateRequiredFields(body, ['name', 'email'])).not.toThrow();
    });

    it('should throw ValidationError with list of missing fields', () => {
      const body = { name: 'John' };

      expect(() => validateRequiredFields(body, ['name', 'email', 'age'])).toThrow(
        'Missing required fields: email, age'
      );
    });

    it('should not throw when fields array is empty', () => {
      const body = {};

      expect(() => validateRequiredFields(body, [])).not.toThrow();
    });
  });

  describe('getUpdateMode', () => {
    it('should return undefined when updateMode is not present', () => {
      const mockReq = { query: {} } as unknown as Request;

      const result = getUpdateMode(mockReq);

      expect(result).toBeUndefined();
    });

    it('should return "this" when updateMode is "this"', () => {
      const mockReq = { query: { updateMode: 'this' } } as unknown as Request;

      const result = getUpdateMode(mockReq);

      expect(result).toBe('this');
    });

    it('should return "all" when updateMode is "all"', () => {
      const mockReq = { query: { updateMode: 'all' } } as unknown as Request;

      const result = getUpdateMode(mockReq);

      expect(result).toBe('all');
    });

    it('should return "future" when updateMode is "future"', () => {
      const mockReq = { query: { updateMode: 'future' } } as unknown as Request;

      const result = getUpdateMode(mockReq);

      expect(result).toBe('future');
    });

    it('should throw ValidationError for invalid updateMode', () => {
      const mockReq = { query: { updateMode: 'invalid' } } as unknown as Request;

      expect(() => getUpdateMode(mockReq)).toThrow('Invalid updateMode. Must be: this, all, or future');
    });
  });
});

