import { describe, it, expect } from 'vitest';
import {
  getBlockDuration,
  isBlockInDay,
  getBlocksForDay,
  sortBlocksByTime,
  formatBlockTime,
  isBlockPast,
  isBlockCurrent,
  findBlockById,
  getBlockCompositeId,
  calculateBlockPosition,
  getBlocksForDayAndCalendar,
  getTimedBlocksForDay,
  getAllDayBlocksForDay,
} from '../calendarNormalizer';
import { createMockBlock, createMockAllDayBlock, createTestDate } from '@/test-utils/testHelpers';

describe('calendarNormalizer', () => {
  describe('getBlockDuration', () => {
    it('calculates duration correctly', () => {
      const block = createMockBlock({
        startTime: new Date(2024, 5, 12, 9, 0),
        endTime: new Date(2024, 5, 12, 10, 0),
      });

      const duration = getBlockDuration(block);
      expect(duration).toBe(60 * 60 * 1000); // 1 hour in ms
    });
  });

  describe('isBlockInDay', () => {
    it('returns true for block on the same day', () => {
      const block = createMockBlock({
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 12, 10, 0),
      });

      expect(isBlockInDay(block, createTestDate(2024, 6, 12))).toBe(true);
    });

    it('returns false for block on different day', () => {
      const block = createMockBlock({
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 12, 10, 0),
      });

      expect(isBlockInDay(block, createTestDate(2024, 6, 13))).toBe(false);
    });

    it('handles all-day events correctly', () => {
      const block = createMockAllDayBlock({
        startTime: createTestDate(2024, 6, 12, 0, 0),
        endTime: createTestDate(2024, 6, 13, 0, 0), // Next day midnight
      });

      expect(isBlockInDay(block, createTestDate(2024, 6, 12))).toBe(true);
      expect(isBlockInDay(block, createTestDate(2024, 6, 13))).toBe(false); // End is exclusive
    });

    it('handles multi-day events', () => {
      const block = createMockBlock({
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 14, 17, 0),
      });

      expect(isBlockInDay(block, createTestDate(2024, 6, 12))).toBe(true);
      expect(isBlockInDay(block, createTestDate(2024, 6, 13))).toBe(true);
      expect(isBlockInDay(block, createTestDate(2024, 6, 14))).toBe(true);
      expect(isBlockInDay(block, createTestDate(2024, 6, 15))).toBe(false);
    });
  });

  describe('getBlocksForDay', () => {
    it('filters blocks for a specific day', () => {
      const blocks = [
        createMockBlock({
          id: '1',
          startTime: createTestDate(2024, 6, 12, 9, 0),
          endTime: createTestDate(2024, 6, 12, 10, 0),
        }),
        createMockBlock({
          id: '2',
          startTime: createTestDate(2024, 6, 13, 9, 0),
          endTime: createTestDate(2024, 6, 13, 10, 0),
        }),
        createMockBlock({
          id: '3',
          startTime: createTestDate(2024, 6, 12, 14, 0),
          endTime: createTestDate(2024, 6, 12, 15, 0),
        }),
      ];

      const result = getBlocksForDay(blocks, createTestDate(2024, 6, 12));

      expect(result).toHaveLength(2);
      expect(result.map((b) => b.id)).toEqual(['1', '3']);
    });
  });

  describe('sortBlocksByTime', () => {
    it('sorts blocks by start time', () => {
      const blocks = [
        createMockBlock({
          id: '1',
          startTime: createTestDate(2024, 6, 12, 14, 0),
          endTime: createTestDate(2024, 6, 12, 15, 0),
        }),
        createMockBlock({
          id: '2',
          startTime: createTestDate(2024, 6, 12, 9, 0),
          endTime: createTestDate(2024, 6, 12, 10, 0),
        }),
        createMockBlock({
          id: '3',
          startTime: createTestDate(2024, 6, 12, 11, 0),
          endTime: createTestDate(2024, 6, 12, 12, 0),
        }),
      ];

      const sorted = sortBlocksByTime(blocks);

      expect(sorted.map((b) => b.id)).toEqual(['2', '3', '1']);
    });

    it('does not mutate original array', () => {
      const blocks = [
        createMockBlock({
          id: '1',
          startTime: createTestDate(2024, 6, 12, 14, 0),
          endTime: createTestDate(2024, 6, 12, 15, 0),
        }),
        createMockBlock({
          id: '2',
          startTime: createTestDate(2024, 6, 12, 9, 0),
          endTime: createTestDate(2024, 6, 12, 10, 0),
        }),
      ];

      sortBlocksByTime(blocks);

      expect(blocks[0].id).toBe('1'); // Original unchanged
    });
  });

  describe('formatBlockTime', () => {
    it('formats timed block correctly', () => {
      const block = createMockBlock({
        startTime: createTestDate(2024, 6, 12, 9, 30),
        endTime: createTestDate(2024, 6, 12, 10, 45),
      });

      const result = formatBlockTime(block);

      expect(result).toContain('09:30');
      expect(result).toContain('10:45');
    });

    it('returns "Heldag" for all-day blocks', () => {
      const block = createMockAllDayBlock();

      expect(formatBlockTime(block)).toBe('Heldag');
    });
  });

  describe('isBlockPast', () => {
    it('returns true for past blocks', () => {
      const block = createMockBlock({
        startTime: new Date(2020, 0, 1, 9, 0),
        endTime: new Date(2020, 0, 1, 10, 0),
      });

      expect(isBlockPast(block)).toBe(true);
    });

    it('returns false for future blocks', () => {
      const block = createMockBlock({
        startTime: new Date(2099, 0, 1, 9, 0),
        endTime: new Date(2099, 0, 1, 10, 0),
      });

      expect(isBlockPast(block)).toBe(false);
    });
  });

  describe('isBlockCurrent', () => {
    it('returns false for past blocks', () => {
      const block = createMockBlock({
        startTime: new Date(2020, 0, 1, 9, 0),
        endTime: new Date(2020, 0, 1, 10, 0),
      });

      expect(isBlockCurrent(block)).toBe(false);
    });

    it('returns false for future blocks', () => {
      const block = createMockBlock({
        startTime: new Date(2099, 0, 1, 9, 0),
        endTime: new Date(2099, 0, 1, 10, 0),
      });

      expect(isBlockCurrent(block)).toBe(false);
    });
  });

  describe('findBlockById', () => {
    it('finds block by composite ID', () => {
      const blocks = [
        createMockBlock({ id: 'event1', calendarId: 'cal1' }),
        createMockBlock({ id: 'event2', calendarId: 'cal2' }),
      ];

      const result = findBlockById(blocks, 'cal2-event2');

      expect(result).toBeDefined();
      expect(result?.id).toBe('event2');
    });

    it('returns undefined for non-existent ID', () => {
      const blocks = [createMockBlock({ id: 'event1', calendarId: 'cal1' })];

      const result = findBlockById(blocks, 'cal1-event2');

      expect(result).toBeUndefined();
    });
  });

  describe('getBlockCompositeId', () => {
    it('creates composite ID from block', () => {
      const block = createMockBlock({ id: 'event1', calendarId: 'cal1' });

      expect(getBlockCompositeId(block)).toBe('cal1-event1');
    });
  });

  describe('calculateBlockPosition', () => {
    it('calculates position for morning event', () => {
      const block = createMockBlock({
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 12, 10, 0),
      });

      const { top, height } = calculateBlockPosition(block, 60, 30);

      expect(top).toBe(9 * 60); // 9am * 60px
      expect(height).toBe(60); // 1 hour
    });

    it('calculates position with minutes', () => {
      const block = createMockBlock({
        startTime: createTestDate(2024, 6, 12, 9, 30),
        endTime: createTestDate(2024, 6, 12, 10, 0),
      });

      const { top } = calculateBlockPosition(block, 60, 30);

      expect(top).toBe(9.5 * 60); // 9:30am
    });

    it('respects minimum height', () => {
      const block = createMockBlock({
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 12, 9, 15), // 15 minutes
      });

      const { height } = calculateBlockPosition(block, 60, 30);

      expect(height).toBe(30); // Minimum height
    });
  });

  describe('getBlocksForDayAndCalendar', () => {
    it('filters blocks by day and calendar', () => {
      const blocks = [
        createMockBlock({
          id: '1',
          calendarId: 'cal1',
          startTime: createTestDate(2024, 6, 12, 9, 0),
          endTime: createTestDate(2024, 6, 12, 10, 0),
        }),
        createMockBlock({
          id: '2',
          calendarId: 'cal2',
          startTime: createTestDate(2024, 6, 12, 9, 0),
          endTime: createTestDate(2024, 6, 12, 10, 0),
        }),
        createMockBlock({
          id: '3',
          calendarId: 'cal1',
          startTime: createTestDate(2024, 6, 13, 9, 0),
          endTime: createTestDate(2024, 6, 13, 10, 0),
        }),
      ];

      const result = getBlocksForDayAndCalendar(blocks, createTestDate(2024, 6, 12), 'cal1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('getTimedBlocksForDay', () => {
    it('excludes all-day blocks', () => {
      const blocks = [
        createMockBlock({
          id: '1',
          startTime: createTestDate(2024, 6, 12, 9, 0),
          endTime: createTestDate(2024, 6, 12, 10, 0),
        }),
        createMockAllDayBlock({
          id: '2',
          startTime: createTestDate(2024, 6, 12, 0, 0),
          endTime: createTestDate(2024, 6, 13, 0, 0),
        }),
      ];

      const result = getTimedBlocksForDay(blocks, createTestDate(2024, 6, 12));

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('getAllDayBlocksForDay', () => {
    it('only returns all-day blocks', () => {
      const blocks = [
        createMockBlock({
          id: '1',
          startTime: createTestDate(2024, 6, 12, 9, 0),
          endTime: createTestDate(2024, 6, 12, 10, 0),
        }),
        createMockAllDayBlock({
          id: '2',
          startTime: createTestDate(2024, 6, 12, 0, 0),
          endTime: createTestDate(2024, 6, 13, 0, 0),
        }),
      ];

      const result = getAllDayBlocksForDay(blocks, createTestDate(2024, 6, 12));

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });
});

