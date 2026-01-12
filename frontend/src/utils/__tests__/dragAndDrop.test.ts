import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleAllDayEventDrop,
  handleTimedEventDrop,
  handleDayOnlyDrop,
  handleCalendarAndDayDrop,
  handleDragDrop,
  type EventMutations,
} from '@/utils/dragAndDrop';
import {
  createMockBlock,
  createMockAllDayBlock,
  createTestDate,
  createMockMutations,
} from '@/test-utils/testHelpers';

describe('dragAndDrop', () => {
  let mutations: EventMutations;

  beforeEach(() => {
    mutations = createMockMutations();
  });

  describe('handleAllDayEventDrop', () => {
    it('moves event when calendar changes', async () => {
      const block = createMockAllDayBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 0, 0),
        endTime: createTestDate(2024, 6, 13, 0, 0),
      });

      await handleAllDayEventDrop(
        block,
        { date: createTestDate(2024, 6, 12), calendarId: 'cal2' },
        mutations
      );

      expect(mutations.moveEvent.mutateAsync).toHaveBeenCalledWith({
        blockId: 'event1',
        calendarId: 'cal1',
        targetCalendarId: 'cal2',
        startTime: block.startTime,
      });
    });

    it('updates time when date changes', async () => {
      const block = createMockAllDayBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 0, 0),
        endTime: createTestDate(2024, 6, 13, 0, 0),
      });

      await handleAllDayEventDrop(block, { date: createTestDate(2024, 6, 15) }, mutations);

      expect(mutations.updateEventTime.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          blockId: 'event1',
          calendarId: 'cal1',
          allDay: true,
        })
      );
    });

    it('does nothing when date is same and no calendar change', async () => {
      const block = createMockAllDayBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 0, 0),
        endTime: createTestDate(2024, 6, 13, 0, 0),
      });

      await handleAllDayEventDrop(block, { date: createTestDate(2024, 6, 12) }, mutations);

      expect(mutations.moveEvent.mutateAsync).not.toHaveBeenCalled();
      expect(mutations.updateEventTime.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('handleTimedEventDrop', () => {
    it('updates event time to new time slot', async () => {
      const block = createMockBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 12, 10, 0),
      });

      await handleTimedEventDrop(
        block,
        { date: createTestDate(2024, 6, 12), hour: 14, minute: 30 },
        mutations
      );

      expect(mutations.updateEventTime.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          blockId: 'event1',
          calendarId: 'cal1',
        })
      );

      const callArgs = (mutations.updateEventTime.mutateAsync as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callArgs.startTime.getHours()).toBe(14);
      expect(callArgs.startTime.getMinutes()).toBe(30);
    });

    it('moves event first when calendar changes', async () => {
      const block = createMockBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 12, 10, 0),
      });

      await handleTimedEventDrop(
        block,
        { date: createTestDate(2024, 6, 12), hour: 14, minute: 0 },
        mutations,
        'cal2'
      );

      expect(mutations.moveEvent.mutateAsync).toHaveBeenCalledBefore(
        mutations.updateEventTime.mutateAsync as ReturnType<typeof vi.fn>
      );
    });

    it('preserves event duration', async () => {
      const block = createMockBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 12, 11, 0), // 2 hour event
      });

      await handleTimedEventDrop(
        block,
        { date: createTestDate(2024, 6, 12), hour: 14, minute: 0 },
        mutations
      );

      const callArgs = (mutations.updateEventTime.mutateAsync as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      const duration = callArgs.endTime.getTime() - callArgs.startTime.getTime();
      expect(duration).toBe(2 * 60 * 60 * 1000); // 2 hours in ms
    });
  });

  describe('handleDayOnlyDrop', () => {
    it('preserves time when changing day', async () => {
      const block = createMockBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 14, 30),
        endTime: createTestDate(2024, 6, 12, 15, 30),
      });

      await handleDayOnlyDrop(block, { date: createTestDate(2024, 6, 15) }, mutations);

      const callArgs = (mutations.updateEventTime.mutateAsync as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callArgs.startTime.getDate()).toBe(15);
      expect(callArgs.startTime.getHours()).toBe(14);
      expect(callArgs.startTime.getMinutes()).toBe(30);
    });
  });

  describe('handleCalendarAndDayDrop', () => {
    it('moves event when calendar changes', async () => {
      const block = createMockBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 12, 10, 0),
      });

      await handleCalendarAndDayDrop(
        block,
        { date: createTestDate(2024, 6, 12), calendarId: 'cal2' },
        mutations
      );

      expect(mutations.moveEvent.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          blockId: 'event1',
          calendarId: 'cal1',
          targetCalendarId: 'cal2',
        })
      );
    });

    it('updates time when day changes', async () => {
      const block = createMockBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 12, 10, 0),
      });

      await handleCalendarAndDayDrop(
        block,
        { date: createTestDate(2024, 6, 15), calendarId: 'cal1' },
        mutations
      );

      expect(mutations.updateEventTime.mutateAsync).toHaveBeenCalled();
    });
  });

  describe('handleDragDrop', () => {
    it('routes all-day events correctly', async () => {
      const block = createMockAllDayBlock({
        id: 'event1',
        calendarId: 'cal1',
      });

      await handleDragDrop(block, { date: createTestDate(2024, 6, 15) }, mutations);

      // Should call updateEventTime with allDay: true
      expect(mutations.updateEventTime.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          allDay: true,
        })
      );
    });

    it('routes time slot drops correctly', async () => {
      const block = createMockBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 12, 10, 0),
      });

      await handleDragDrop(
        block,
        { date: createTestDate(2024, 6, 12), hour: 14, minute: 0 },
        mutations
      );

      expect(mutations.updateEventTime.mutateAsync).toHaveBeenCalled();
    });

    it('routes calendar change with time correctly', async () => {
      const block = createMockBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 9, 0),
        endTime: createTestDate(2024, 6, 12, 10, 0),
      });

      await handleDragDrop(
        block,
        { date: createTestDate(2024, 6, 12), calendarId: 'cal2', hour: 14, minute: 0 },
        mutations
      );

      expect(mutations.moveEvent.mutateAsync).toHaveBeenCalled();
      expect(mutations.updateEventTime.mutateAsync).toHaveBeenCalled();
    });

    it('routes day-only drops correctly', async () => {
      const block = createMockBlock({
        id: 'event1',
        calendarId: 'cal1',
        startTime: createTestDate(2024, 6, 12, 14, 30),
        endTime: createTestDate(2024, 6, 12, 15, 30),
      });

      await handleDragDrop(block, { date: createTestDate(2024, 6, 15) }, mutations);

      expect(mutations.updateEventTime.mutateAsync).toHaveBeenCalled();
      expect(mutations.moveEvent.mutateAsync).not.toHaveBeenCalled();
    });
  });
});

