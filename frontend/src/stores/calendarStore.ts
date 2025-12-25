import { create } from 'zustand';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from 'date-fns';
import type { Block } from '@/types';
import { eventsApi } from '@/services/api';
import { useConfigStore } from './configStore';

// Helper to get week key for caching
const getWeekKey = (date: Date): string => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  return weekStart.toISOString();
};

interface WeekCache {
  [weekKey: string]: {
    blocks: Block[];
    fetchedAt: number;
  };
}

interface CalendarState {
  blocks: Block[];
  selectedDate: Date;
  selectedBlock: Block | null;
  isLoading: boolean;
  error: string | null;
  weekCache: WeekCache;

  // Actions
  fetchBlocks: (options?: { targetDate?: Date; silent?: boolean }) => Promise<void>;
  prefetchAdjacentWeeks: () => void;
  nextWeek: () => void;
  prevWeek: () => void;
  goToToday: () => void;
  setSelectedDate: (date: Date) => void;
  selectBlock: (block: Block | null) => void;

  // Block operations
  createBlock: (data: {
    calendarId: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    allDay?: boolean;
  }) => Promise<void>;
  moveBlock: (blockId: string, calendarId: string, targetCalendarId: string) => Promise<void>;
  updateBlockTime: (blockId: string, calendarId: string, startTime: Date, endTime: Date) => Promise<void>;
  deleteBlock: (blockId: string, calendarId: string) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  blocks: [],
  selectedDate: new Date(),
  selectedBlock: null,
  isLoading: false,
  error: null,
  weekCache: {},

  fetchBlocks: async (options?: { targetDate?: Date; silent?: boolean }) => {
    const { config } = useConfigStore.getState();

    if (config.calendars.length === 0) {
      set({ blocks: [], isLoading: false });
      return;
    }

    const { selectedDate, weekCache } = get();
    const targetDate = options?.targetDate;
    const silent = options?.silent || false;
    const dateToFetch = targetDate || selectedDate;
    const weekKey = getWeekKey(dateToFetch);

    // Check cache first
    const isCurrentWeek = isSameWeek(dateToFetch, selectedDate, { weekStartsOn: 1 });
    const cached = weekCache[weekKey];
    const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

    // For prefetching or background refreshes, check cache
    if (cached && Date.now() - cached.fetchedAt < cacheMaxAge) {
      // Use cached data for adjacent weeks (prefetch)
      if (targetDate && !isCurrentWeek) {
        return;
      }
      // For silent refreshes of current week with recent cache, skip
      if (silent && Date.now() - cached.fetchedAt < 30 * 1000) { // 30 seconds
        return;
      }
    }

    // Show loading only if not silent and is current week
    if (!silent && isCurrentWeek) {
      set({ isLoading: true, error: null });
    }

    try {
      const weekStart = startOfWeek(dateToFetch, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(dateToFetch, { weekStartsOn: 1 });

      const blocks = await eventsApi.getEvents(weekStart, weekEnd, config.calendars);

      // Update cache
      set((state) => ({
        weekCache: {
          ...state.weekCache,
          [weekKey]: {
            blocks,
            fetchedAt: Date.now(),
          },
        },
      }));

      // Update current blocks if this is the selected week
      if (isCurrentWeek) {
        set({ blocks, isLoading: false });
      }
    } catch (error) {
      console.error('[CalendarStore] Failed to fetch blocks:', error);
      if (!silent && isCurrentWeek) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch events',
          isLoading: false,
        });
      }
    }
  },

  prefetchAdjacentWeeks: () => {
    const { selectedDate } = get();
    const nextWeekDate = addWeeks(selectedDate, 1);
    const prevWeekDate = subWeeks(selectedDate, 1);

    // Prefetch in background (don't await)
    get().fetchBlocks({ targetDate: nextWeekDate });
    get().fetchBlocks({ targetDate: prevWeekDate });
  },

  nextWeek: () => {
    const { selectedDate, weekCache } = get();
    const newDate = addWeeks(selectedDate, 1);
    const weekKey = getWeekKey(newDate);

    set({ selectedDate: newDate });

    // Check if we have cached data
    const cached = weekCache[weekKey];
    if (cached) {
      // Use cached data immediately - ensure dates are Date objects
      const blocks = cached.blocks.map((block) => ({
        ...block,
        startTime: block.startTime instanceof Date ? block.startTime : new Date(block.startTime),
        endTime: block.endTime instanceof Date ? block.endTime : new Date(block.endTime),
      }));
      set({ blocks, isLoading: false });
      // Refresh in background silently to get latest data
      get().fetchBlocks({ silent: true });
      get().prefetchAdjacentWeeks();
    } else {
      // Fetch new data with loading state
      get().fetchBlocks();
      get().prefetchAdjacentWeeks();
    }
  },

  prevWeek: () => {
    const { selectedDate, weekCache } = get();
    const newDate = subWeeks(selectedDate, 1);
    const weekKey = getWeekKey(newDate);

    set({ selectedDate: newDate });

    // Check if we have cached data
    const cached = weekCache[weekKey];
    if (cached) {
      // Use cached data immediately - ensure dates are Date objects
      const blocks = cached.blocks.map((block) => ({
        ...block,
        startTime: block.startTime instanceof Date ? block.startTime : new Date(block.startTime),
        endTime: block.endTime instanceof Date ? block.endTime : new Date(block.endTime),
      }));
      set({ blocks, isLoading: false });
      // Refresh in background silently to get latest data
      get().fetchBlocks({ silent: true });
      get().prefetchAdjacentWeeks();
    } else {
      // Fetch new data with loading state
      get().fetchBlocks();
      get().prefetchAdjacentWeeks();
    }
  },

  goToToday: () => {
    set({ selectedDate: new Date() });
    get().fetchBlocks();
    get().prefetchAdjacentWeeks();
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().fetchBlocks();
    get().prefetchAdjacentWeeks();
  },

  selectBlock: (block) => {
    set({ selectedBlock: block });
  },

  createBlock: async (data) => {
    try {
      await eventsApi.createEvent(data);

      // Invalidate cache for the affected week
      const weekKey = getWeekKey(data.startTime);
      set((state) => {
        const newCache = { ...state.weekCache };
        delete newCache[weekKey];
        return { weekCache: newCache };
      });

      // Refresh blocks to include the new event
      await get().fetchBlocks();
      get().prefetchAdjacentWeeks();
    } catch (error) {
      set({ error: 'Failed to create event' });
      console.error('Failed to create block:', error);
      throw error;
    }
  },

  moveBlock: async (blockId, calendarId, targetCalendarId) => {
    const { config } = useConfigStore.getState();
    const targetCalendar = config.calendars.find((c) => c.id === targetCalendarId);

    if (!targetCalendar) {
      set({ error: 'Target calendar not found' });
      return;
    }

    // Optimistic update
    const { blocks, selectedBlock } = get();
    const updatedBlocks = blocks.map((b) =>
      b.id === blockId && b.calendarId === calendarId
        ? { ...b, responsiblePersonId: targetCalendarId, calendarId: targetCalendarId }
        : b
    );
    set({ blocks: updatedBlocks });

    // Update selected block if it's the one being moved
    if (selectedBlock?.id === blockId && selectedBlock.calendarId === calendarId) {
      set({
        selectedBlock: {
          ...selectedBlock,
          responsiblePersonId: targetCalendarId,
          calendarId: targetCalendarId,
        },
      });
    }

    try {
      const result = await eventsApi.moveEvent(calendarId, blockId, targetCalendarId);

      // Invalidate cache for current week
      const movedBlock = blocks.find((b) => b.id === blockId && b.calendarId === calendarId);
      if (movedBlock) {
        const weekKey = getWeekKey(movedBlock.startTime);
        set((state) => {
          const newCache = { ...state.weekCache };
          delete newCache[weekKey];
          return { weekCache: newCache };
        });
      }

      // Update with new event ID
      set((state) => ({
        blocks: state.blocks.map((b) =>
          b.id === blockId && b.calendarId === targetCalendarId ? { ...b, id: result.newEventId } : b
        ),
        selectedBlock:
          state.selectedBlock?.id === blockId ? { ...state.selectedBlock, id: result.newEventId } : state.selectedBlock,
      }));
    } catch (error) {
      // Revert on error
      set({ blocks, selectedBlock, error: 'Failed to move event' });
      console.error('Failed to move block:', error);
    }
  },

  updateBlockTime: async (blockId, calendarId, startTime, endTime) => {
    // Optimistic update
    const { blocks } = get();
    const updatedBlocks = blocks.map((b) =>
      b.id === blockId && b.calendarId === calendarId ? { ...b, startTime, endTime } : b
    );
    set({ blocks: updatedBlocks });

    try {
      await eventsApi.updateEvent(calendarId, blockId, { startTime, endTime });

      // Invalidate cache for affected weeks
      const weekKey = getWeekKey(startTime);
      set((state) => {
        const newCache = { ...state.weekCache };
        delete newCache[weekKey];
        return { weekCache: newCache };
      });
    } catch (error) {
      // Revert on error
      set({ blocks, error: 'Failed to update event time' });
      console.error('Failed to update block time:', error);
    }
  },

  deleteBlock: async (blockId, calendarId) => {
    // Optimistic update
    const { blocks, selectedBlock } = get();
    const deletedBlock = blocks.find((b) => b.id === blockId && b.calendarId === calendarId);
    const updatedBlocks = blocks.filter((b) => !(b.id === blockId && b.calendarId === calendarId));
    set({
      blocks: updatedBlocks,
      selectedBlock: selectedBlock?.id === blockId ? null : selectedBlock,
    });

    try {
      await eventsApi.deleteEvent(calendarId, blockId);

      // Invalidate cache for the affected week
      if (deletedBlock) {
        const weekKey = getWeekKey(deletedBlock.startTime);
        set((state) => {
          const newCache = { ...state.weekCache };
          delete newCache[weekKey];
          return { weekCache: newCache };
        });
      }
    } catch (error) {
      // Revert on error
      set({ blocks, selectedBlock, error: 'Failed to delete event' });
      console.error('Failed to delete block:', error);
    }
  },
}));
