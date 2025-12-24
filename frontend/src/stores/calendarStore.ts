import { create } from 'zustand';
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import type { Block } from '../types';
import { eventsApi } from '../services/api';
import { useConfigStore } from './configStore';

interface CalendarState {
  blocks: Block[];
  selectedDate: Date;
  selectedBlock: Block | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchBlocks: () => Promise<void>;
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

  fetchBlocks: async () => {
    const { config } = useConfigStore.getState();

    if (config.calendars.length === 0) {
      set({ blocks: [], isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { selectedDate } = get();
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

      const blocks = await eventsApi.getEvents(weekStart, weekEnd, config.calendars);

      set({ blocks, isLoading: false });
    } catch (error) {
      console.error('[CalendarStore] Failed to fetch blocks:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        isLoading: false,
      });
    }
  },

  nextWeek: () => {
    set((state) => ({ selectedDate: addWeeks(state.selectedDate, 1) }));
    get().fetchBlocks();
  },

  prevWeek: () => {
    set((state) => ({ selectedDate: subWeeks(state.selectedDate, 1) }));
    get().fetchBlocks();
  },

  goToToday: () => {
    set({ selectedDate: new Date() });
    get().fetchBlocks();
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().fetchBlocks();
  },

  selectBlock: (block) => {
    set({ selectedBlock: block });
  },

  createBlock: async (data) => {
    try {
      await eventsApi.createEvent(data);

      // Refresh blocks to include the new event
      await get().fetchBlocks();
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
    } catch (error) {
      // Revert on error
      set({ blocks, error: 'Failed to update event time' });
      console.error('Failed to update block time:', error);
    }
  },

  deleteBlock: async (blockId, calendarId) => {
    // Optimistic update
    const { blocks, selectedBlock } = get();
    const updatedBlocks = blocks.filter((b) => !(b.id === blockId && b.calendarId === calendarId));
    set({
      blocks: updatedBlocks,
      selectedBlock: selectedBlock?.id === blockId ? null : selectedBlock,
    });

    try {
      await eventsApi.deleteEvent(calendarId, blockId);
    } catch (error) {
      // Revert on error
      set({ blocks, selectedBlock, error: 'Failed to delete event' });
      console.error('Failed to delete block:', error);
    }
  },
}));
