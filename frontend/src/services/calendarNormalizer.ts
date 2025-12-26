import { startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import type { Block } from '@/types';

// This file contains utility functions for working with Block data
// The actual normalization from Google Calendar events happens on the backend

export function getBlockDuration(block: Block): number {
  return block.endTime.getTime() - block.startTime.getTime();
}

export function isBlockInDay(block: Block, date: Date): boolean {
  // Ensure we're working with Date objects
  const blockStart = block.startTime instanceof Date ? block.startTime : new Date(block.startTime);
  const blockEnd = block.endTime instanceof Date ? block.endTime : new Date(block.endTime);

  // For all-day events, endTime is exclusive (midnight of next day)
  // and dates should be compared without time components
  if (block.allDay) {
    const dayStart = startOfDay(date);
    const blockStartDay = startOfDay(blockStart);
    const blockEndDay = startOfDay(blockEnd);

    // Check if this day falls within the event's date range (end is exclusive)
    return !isBefore(dayStart, blockStartDay) && isBefore(dayStart, blockEndDay);
  }

  // For timed events, check if the block overlaps with the day
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  // Block overlaps if it starts before day ends and ends after day starts
  return !isAfter(blockStart, dayEnd) && !isBefore(blockEnd, dayStart);
}

export function getBlocksForDay(blocks: Block[], date: Date): Block[] {
  return blocks.filter((block) => isBlockInDay(block, date));
}

export function sortBlocksByTime(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export function formatBlockTime(block: Block): string {
  if (block.allDay) {
    return 'Heldag';
  }

  const start = new Date(block.startTime);
  const end = new Date(block.endTime);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function isBlockPast(block: Block): boolean {
  return new Date(block.endTime) < new Date();
}

export function isBlockCurrent(block: Block): boolean {
  const now = new Date();
  return new Date(block.startTime) <= now && new Date(block.endTime) >= now;
}

/**
 * Find a block by its composite ID (calendarId-blockId)
 */
export function findBlockById(blocks: Block[], compositeId: string): Block | undefined {
  return blocks.find((b) => `${b.calendarId}-${b.id}` === compositeId);
}

/**
 * Create a composite ID from a block
 */
export function getBlockCompositeId(block: Block): string {
  return `${block.calendarId}-${block.id}`;
}

/**
 * Calculate the visual position of a block in an hour-based view
 * Returns top position and height in pixels
 */
export function calculateBlockPosition(
  block: Block,
  pixelsPerHour: number,
  minHeight: number = 30
): { top: number; height: number } {
  const startHour = block.startTime.getHours();
  const startMinute = block.startTime.getMinutes();
  const endHour = block.endTime.getHours();
  const endMinute = block.endTime.getMinutes();

  const top = (startHour + startMinute / 60) * pixelsPerHour;
  const duration = endHour - startHour + (endMinute - startMinute) / 60;
  const height = Math.max(duration * pixelsPerHour, minHeight);

  return { top, height };
}

/**
 * Get blocks for a specific day and calendar
 */
export function getBlocksForDayAndCalendar(blocks: Block[], date: Date, calendarId: string): Block[] {
  const dayBlocks = getBlocksForDay(blocks, date);
  return sortBlocksByTime(dayBlocks.filter((b) => b.calendarId === calendarId));
}

/**
 * Get timed (non-all-day) blocks for a day
 */
export function getTimedBlocksForDay(blocks: Block[], date: Date): Block[] {
  return getBlocksForDay(blocks, date).filter((block) => !block.allDay);
}

/**
 * Get all-day blocks for a day
 */
export function getAllDayBlocksForDay(blocks: Block[], date: Date): Block[] {
  return getBlocksForDay(blocks, date).filter((block) => block.allDay);
}
