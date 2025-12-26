/**
 * Drag and drop utilities
 * Handles event time updates when dragging blocks to new locations
 */

import type { Block } from '@/types';
import {
  calculateEventDuration,
  createAllDayEventTimes,
  preserveTimeOnNewDate,
  createDateWithTime,
} from './dateUtils';

/**
 * Types for mutation functions
 */
export interface UpdateEventTimeParams {
  blockId: string;
  calendarId: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
}

export interface MoveEventParams {
  blockId: string;
  calendarId: string;
  targetCalendarId: string;
  startTime: Date;
}

export interface EventMutations {
  updateEventTime: {
    mutateAsync: (params: UpdateEventTimeParams) => Promise<unknown>;
  };
  moveEvent: {
    mutateAsync: (params: MoveEventParams) => Promise<unknown>;
  };
}

/**
 * Drop data types for different scenarios
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
  calendarId?: string;
  hour?: number;
  minute?: number;
}

/**
 * Handle dropping an all-day event to a new date/calendar
 */
export async function handleAllDayEventDrop(
  block: Block,
  dropData: FullDropData,
  mutations: EventMutations
): Promise<void> {
  if (!dropData.date) return;

  const needsMove = dropData.calendarId && block.calendarId !== dropData.calendarId;
  const needsTimeUpdate = block.startTime.toDateString() !== dropData.date.toDateString();

  // If calendar changed, move the event first
  if (needsMove && dropData.calendarId) {
    try {
      await mutations.moveEvent.mutateAsync({
        blockId: block.id,
        calendarId: block.calendarId,
        targetCalendarId: dropData.calendarId,
        startTime: block.startTime,
      });
    } catch (error) {
      console.error('Failed to move block:', error);
      return;
    }
  }

  // If day changed, update the time
  if (needsTimeUpdate) {
    const { startTime, endTime } = createAllDayEventTimes(dropData.date);
    const targetCalendarId = needsMove && dropData.calendarId ? dropData.calendarId : block.calendarId;

    try {
      await mutations.updateEventTime.mutateAsync({
        blockId: block.id,
        calendarId: targetCalendarId,
        startTime,
        endTime,
        allDay: true,
      });
    } catch (error) {
      console.error('Failed to update block time:', error);
    }
  }
}

/**
 * Handle dropping a timed event to a specific time slot
 */
export async function handleTimedEventDrop(
  block: Block,
  dropData: TimeSlotDropData,
  mutations: EventMutations,
  targetCalendarId?: string
): Promise<void> {
  const needsMove = targetCalendarId && block.calendarId !== targetCalendarId;
  const newStartTime = createDateWithTime(dropData.date, dropData.hour, dropData.minute);
  const duration = calculateEventDuration(block.startTime, block.endTime);
  const newEndTime = new Date(newStartTime.getTime() + duration);

  // If calendar changed, move the event first
  if (needsMove && targetCalendarId) {
    try {
      await mutations.moveEvent.mutateAsync({
        blockId: block.id,
        calendarId: block.calendarId,
        targetCalendarId,
        startTime: block.startTime,
      });
    } catch (error) {
      console.error('Failed to move block:', error);
      return;
    }
  }

  // Update the time
  try {
    await mutations.updateEventTime.mutateAsync({
      blockId: block.id,
      calendarId: needsMove && targetCalendarId ? targetCalendarId : block.calendarId,
      startTime: newStartTime,
      endTime: newEndTime,
    });
  } catch (error) {
    console.error('Failed to update block time:', error);
  }
}

/**
 * Handle dropping an event to a new day only (preserve time)
 */
export async function handleDayOnlyDrop(
  block: Block,
  dropData: DateOnlyDropData,
  mutations: EventMutations
): Promise<void> {
  const newStartTime = preserveTimeOnNewDate(block.startTime, dropData.date);
  const duration = calculateEventDuration(block.startTime, block.endTime);
  const newEndTime = new Date(newStartTime.getTime() + duration);

  try {
    await mutations.updateEventTime.mutateAsync({
      blockId: block.id,
      calendarId: block.calendarId,
      startTime: newStartTime,
      endTime: newEndTime,
    });
  } catch (error) {
    console.error('Failed to update block:', error);
  }
}

/**
 * Handle dropping an event to a new day and calendar (preserve time)
 */
export async function handleCalendarAndDayDrop(
  block: Block,
  dropData: DateCalendarDropData,
  mutations: EventMutations
): Promise<void> {
  const needsMove = block.calendarId !== dropData.calendarId;
  const needsTimeUpdate = block.startTime.toDateString() !== dropData.date.toDateString();

  // If calendar changed, move the event first
  if (needsMove) {
    try {
      await mutations.moveEvent.mutateAsync({
        blockId: block.id,
        calendarId: block.calendarId,
        targetCalendarId: dropData.calendarId,
        startTime: block.startTime,
      });
    } catch (error) {
      console.error('Failed to move block:', error);
      return;
    }
  }

  // If day changed, update the time (preserving the original time)
  if (needsTimeUpdate) {
    const newStartTime = preserveTimeOnNewDate(block.startTime, dropData.date);
    const duration = calculateEventDuration(block.startTime, block.endTime);
    const newEndTime = new Date(newStartTime.getTime() + duration);

    try {
      await mutations.updateEventTime.mutateAsync({
        blockId: block.id,
        calendarId: needsMove ? dropData.calendarId : block.calendarId,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    } catch (error) {
      console.error('Failed to update block time:', error);
    }
  }
}

/**
 * Unified drag end handler that routes to the appropriate handler
 * based on the drop data structure
 */
export async function handleDragDrop(
  block: Block,
  dropData: FullDropData,
  mutations: EventMutations
): Promise<void> {
  if (!dropData.date) return;

  // Handle all-day events specially
  if (block.allDay) {
    await handleAllDayEventDrop(block, dropData, mutations);
    return;
  }

  // Full drop with calendar and time
  if (dropData.calendarId && dropData.hour !== undefined && dropData.minute !== undefined) {
    await handleTimedEventDrop(
      block,
      { date: dropData.date, hour: dropData.hour, minute: dropData.minute },
      mutations,
      dropData.calendarId
    );
    return;
  }

  // Time slot only (no calendar change)
  if (dropData.hour !== undefined && dropData.minute !== undefined) {
    await handleTimedEventDrop(
      block,
      { date: dropData.date, hour: dropData.hour, minute: dropData.minute },
      mutations
    );
    return;
  }

  // Calendar and day change (preserve time)
  if (dropData.calendarId) {
    await handleCalendarAndDayDrop(
      block,
      { date: dropData.date, calendarId: dropData.calendarId },
      mutations
    );
    return;
  }

  // Day only change (preserve time and calendar)
  await handleDayOnlyDrop(block, { date: dropData.date }, mutations);
}

