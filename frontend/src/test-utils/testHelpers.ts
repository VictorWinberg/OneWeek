import { vi } from 'vitest';
import type { Block, BlockMetadata } from '@/types';

/**
 * Create a mock Block for testing
 */
export function createMockBlock(overrides?: Partial<Block>): Block {
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);

  return {
    id: 'test-event-1',
    calendarId: 'test-calendar-1',
    title: 'Test Event',
    description: 'Test description',
    startTime,
    endTime,
    allDay: false,
    metadata: {} as BlockMetadata,
    ...overrides,
  };
}

/**
 * Create a mock all-day Block for testing
 */
export function createMockAllDayBlock(overrides?: Partial<Block>): Block {
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);

  return {
    id: 'test-allday-event-1',
    calendarId: 'test-calendar-1',
    title: 'Test All Day Event',
    startTime,
    endTime,
    allDay: true,
    metadata: {} as BlockMetadata,
    ...overrides,
  };
}

/**
 * Drop data types for different view scenarios
 */
export interface DateOnlyDropData {
  date: Date;
}

export interface DateCalendarDropData {
  date: Date;
  calendarId: string;
}

export interface TimeSlotDropData {
  date: Date;
  hour: number;
  minute: number;
}

export interface FullDropData {
  date: Date;
  calendarId: string;
  hour: number;
  minute: number;
}

/**
 * Create mock drop data for date-only drops (DayView)
 */
export function createMockDateOnlyDropData(overrides?: Partial<DateOnlyDropData>): DateOnlyDropData {
  return {
    date: new Date(),
    ...overrides,
  };
}

/**
 * Create mock drop data for calendar + date drops (UserView)
 */
export function createMockDateCalendarDropData(
  overrides?: Partial<DateCalendarDropData>
): DateCalendarDropData {
  return {
    date: new Date(),
    calendarId: 'test-calendar-1',
    ...overrides,
  };
}

/**
 * Create mock drop data for time slot drops (HourView, GridView)
 */
export function createMockTimeSlotDropData(overrides?: Partial<TimeSlotDropData>): TimeSlotDropData {
  return {
    date: new Date(),
    hour: 9,
    minute: 0,
    ...overrides,
  };
}

/**
 * Create mock drop data with all fields (MobileView user mode)
 */
export function createMockFullDropData(overrides?: Partial<FullDropData>): FullDropData {
  return {
    date: new Date(),
    calendarId: 'test-calendar-1',
    hour: 9,
    minute: 0,
    ...overrides,
  };
}

/**
 * Create mock mutations for testing drag handlers
 */
export function createMockMutations() {
  return {
    updateEventTime: {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    },
    moveEvent: {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    },
  };
}

/**
 * Create a date at a specific time for testing
 */
export function createTestDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * Create an array of mock blocks for testing
 */
export function createMockBlocks(count: number): Block[] {
  return Array.from({ length: count }, (_, i) => {
    const startHour = 9 + i;
    const now = new Date();
    return createMockBlock({
      id: `test-event-${i + 1}`,
      title: `Test Event ${i + 1}`,
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, 0, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour + 1, 0, 0),
    });
  });
}

