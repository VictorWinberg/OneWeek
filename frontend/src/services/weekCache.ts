import type { Block } from '@/types';

const CACHE_PREFIX = 'oneweek:events:';
const MAX_CACHED_WEEKS = 5;

interface SerializedBlock {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  metadata: {
    category?: string;
    originalCalendarId?: string;
  };
  recurrence?: string[];
  recurringEventId?: string;
}

interface CachedWeekData {
  timestamp: number;
  blocks: SerializedBlock[];
}

function getWeekCacheKey(weekKey: string): string {
  return `${CACHE_PREFIX}${weekKey}`;
}

function serializeBlock(block: Block): SerializedBlock {
  return {
    ...block,
    startTime: block.startTime.toISOString(),
    endTime: block.endTime.toISOString(),
  };
}

function deserializeBlock(serialized: SerializedBlock): Block {
  return {
    ...serialized,
    startTime: new Date(serialized.startTime),
    endTime: new Date(serialized.endTime),
  };
}

function isValidCachedData(data: unknown): data is CachedWeekData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.timestamp !== 'number' || !Array.isArray(obj.blocks)) return false;

  for (const item of obj.blocks.slice(0, 3)) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.id !== 'string' ||
      typeof item.calendarId !== 'string' ||
      typeof item.startTime !== 'string' ||
      typeof item.endTime !== 'string'
    ) {
      return false;
    }
  }

  return true;
}

function getCachedWeekEntries(): { key: string; timestamp: number }[] {
  const entries: { key: string; timestamp: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '');
        if (typeof data?.timestamp === 'number') {
          entries.push({ key, timestamp: data.timestamp });
        }
      } catch {
        // Invalid entry, will be cleaned up
      }
    }
  }
  return entries;
}

function evictOldestWeeks(): void {
  const entries = getCachedWeekEntries();
  if (entries.length <= MAX_CACHED_WEEKS) return;

  entries.sort((a, b) => b.timestamp - a.timestamp);
  const toRemove = entries.slice(MAX_CACHED_WEEKS);
  for (const entry of toRemove) {
    localStorage.removeItem(entry.key);
  }
}

export function getCachedWeek(weekKey: string): Block[] | null {
  try {
    const cacheKey = getWeekCacheKey(weekKey);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const parsed = JSON.parse(cached);

    if (!isValidCachedData(parsed)) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.blocks.map(deserializeBlock);
  } catch {
    return null;
  }
}

export function setCachedWeek(weekKey: string, blocks: Block[]): void {
  try {
    const cacheKey = getWeekCacheKey(weekKey);
    const data: CachedWeekData = {
      timestamp: Date.now(),
      blocks: blocks.map(serializeBlock),
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
    evictOldestWeeks();
  } catch {
    // Ignore storage errors
  }
}
