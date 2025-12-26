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
