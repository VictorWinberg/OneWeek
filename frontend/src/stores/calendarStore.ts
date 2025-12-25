import { create } from 'zustand';
import type { Block } from '@/types';

/**
 * Calendar Store - UI State Only
 *
 * This store handles UI-related state like selected date and selected block.
 * All data fetching, caching, and mutations are handled by React Query hooks.
 */

interface CalendarState {
  // UI State
  selectedDate: Date;
  selectedBlock: Block | null;

  // Actions
  setSelectedDate: (date: Date) => void;
  selectBlock: (block: Block | null) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  // Initial state
  selectedDate: new Date(),
  selectedBlock: null,

  // Actions
  setSelectedDate: (date) => {
    set({ selectedDate: date });
  },

  selectBlock: (block) => {
    set({ selectedBlock: block });
  },
}));
