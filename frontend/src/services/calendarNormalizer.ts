import type { Block, PersonId, BlockMetadata } from '../types';

// This file contains utility functions for working with Block data
// The actual normalization from Google Calendar events happens on the backend

export function getBlockDuration(block: Block): number {
  return block.endTime.getTime() - block.startTime.getTime();
}

export function getBlockDurationMinutes(block: Block): number {
  return getBlockDuration(block) / (1000 * 60);
}

export function getBlockDurationHours(block: Block): number {
  return getBlockDuration(block) / (1000 * 60 * 60);
}

export function isBlockInDay(block: Block, date: Date): boolean {
  const blockStart = new Date(block.startTime);
  const blockEnd = new Date(block.endTime);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Block overlaps with day if it starts before day ends and ends after day starts
  return blockStart <= dayEnd && blockEnd >= dayStart;
}

export function getBlocksForDay(blocks: Block[], date: Date): Block[] {
  return blocks.filter((block) => isBlockInDay(block, date));
}

export function sortBlocksByTime(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

export function groupBlocksByPerson(blocks: Block[]): Record<PersonId, Block[]> {
  const grouped: Partial<Record<PersonId, Block[]>> = {};

  for (const block of blocks) {
    const personId = block.responsiblePersonId;
    if (!grouped[personId]) {
      grouped[personId] = [];
    }
    grouped[personId]!.push(block);
  }

  return grouped as Record<PersonId, Block[]>;
}

export function createBlockMetadata(
  category?: string,
  energy?: number,
  originalCalendarId?: string
): BlockMetadata {
  return {
    ...(category && { category }),
    ...(energy !== undefined && { energy }),
    ...(originalCalendarId && { originalCalendarId }),
  };
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

export function isBlockFuture(block: Block): boolean {
  return new Date(block.startTime) > new Date();
}

