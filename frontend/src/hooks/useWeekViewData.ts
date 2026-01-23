import { useEffect } from 'react';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { useWeekEvents, usePrefetchAdjacentWeeks, useUpdateEvent, useMoveEvent } from '@/hooks/useCalendarQueries';
import { getWeekDays, getWeekNumber, isCurrentWeek } from '@/utils/dateUtils';
import type { Block } from '@/types';

export interface UseWeekViewDataResult {
  // Data
  blocks: Block[];
  weekDays: Date[];
  weekNumber: number;
  selectedDate: Date;

  // State
  isLoading: boolean;
  error: Error | null;
  isConfigured: boolean;
  isCurrentWeekDisplayed: boolean;

  // Mutations
  updateEventTime: ReturnType<typeof useUpdateEvent>;
  moveEvent: ReturnType<typeof useMoveEvent>;
}

/**
 * Custom hook that encapsulates all common data fetching and state management
 * for week view components. Handles:
 * - Event fetching for the selected week
 * - Prefetching adjacent weeks for smooth navigation
 * - Calendar configuration state
 * - Week metadata (days, week number, current week detection)
 */
export function useWeekViewData(): UseWeekViewDataResult {
  const { selectedDate } = useCalendarStore();
  const { isConfigured } = useConfigStore();

  // Fetch events using React Query
  const { data: blocks = [], isLoading, error } = useWeekEvents(selectedDate);
  const { prefetch } = usePrefetchAdjacentWeeks(selectedDate);
  const updateEventTime = useUpdateEvent();
  const moveEvent = useMoveEvent();

  // Prefetch adjacent weeks when data loads
  useEffect(() => {
    if (!isLoading && blocks.length >= 0) {
      prefetch();
    }
  }, [isLoading, prefetch, blocks.length]);

  // Calculate week metadata
  const weekDays = getWeekDays(selectedDate);
  const weekNumber = getWeekNumber(selectedDate);
  const isCurrentWeekDisplayed = isCurrentWeek(selectedDate);

  return {
    // Data
    blocks,
    weekDays,
    weekNumber,
    selectedDate,

    // State
    isLoading,
    error: error as Error | null,
    isConfigured,
    isCurrentWeekDisplayed,

    // Mutations
    updateEventTime,
    moveEvent,
  };
}

