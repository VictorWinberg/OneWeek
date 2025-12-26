import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { eventsApi } from '@/services/api';
import { useConfigStore } from '@/stores/configStore';
import type { Block } from '@/types';

// Helper to get week key for query keys
export const getWeekKey = (date: Date): string => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  return weekStart.toISOString();
};

// Query key factory
export const calendarKeys = {
  all: ['calendar'] as const,
  events: () => [...calendarKeys.all, 'events'] as const,
  week: (weekKey: string) => [...calendarKeys.events(), weekKey] as const,
};

/**
 * Hook to fetch events for a specific week
 */
export function useWeekEvents(selectedDate: Date) {
  const { config } = useConfigStore();
  const weekKey = getWeekKey(selectedDate);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  return useQuery({
    queryKey: calendarKeys.week(weekKey),
    queryFn: async () => {
      if (config.calendars.length === 0) {
        return [];
      }
      return eventsApi.getEvents(weekStart, weekEnd, config.calendars);
    },
    enabled: config.calendars.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to prefetch adjacent weeks
 */
export function usePrefetchAdjacentWeeks(selectedDate: Date) {
  const queryClient = useQueryClient();
  const { config } = useConfigStore();

  const prefetchWeek = async (date: Date) => {
    const weekKey = getWeekKey(date);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

    await queryClient.prefetchQuery({
      queryKey: calendarKeys.week(weekKey),
      queryFn: () => eventsApi.getEvents(weekStart, weekEnd, config.calendars),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetch = () => {
    if (config.calendars.length === 0) return;

    const nextWeek = addWeeks(selectedDate, 1);
    const prevWeek = subWeeks(selectedDate, 1);

    prefetchWeek(nextWeek);
    prefetchWeek(prevWeek);
  };

  return { prefetch };
}

/**
 * Hook to create a new event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      calendarId: string;
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      allDay?: boolean;
    }) => {
      return eventsApi.createEvent(data);
    },
    onSuccess: (_, variables) => {
      // Invalidate the week where the event was created
      const weekKey = getWeekKey(variables.startTime);
      queryClient.invalidateQueries({ queryKey: calendarKeys.week(weekKey) });
    },
  });
}

/**
 * Hook to move an event to a different calendar
 */
export function useMoveEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blockId,
      calendarId,
      targetCalendarId,
    }: {
      blockId: string;
      calendarId: string;
      targetCalendarId: string;
      startTime: Date;
    }) => {
      return eventsApi.moveEvent(calendarId, blockId, targetCalendarId);
    },
    onMutate: async ({ blockId, calendarId, targetCalendarId, startTime }) => {
      const weekKey = getWeekKey(startTime);
      await queryClient.cancelQueries({ queryKey: calendarKeys.week(weekKey) });

      const previousData = queryClient.getQueryData<Block[]>(calendarKeys.week(weekKey));

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<Block[]>(
          calendarKeys.week(weekKey),
          previousData.map((block) =>
            block.id === blockId && block.calendarId === calendarId ? { ...block, calendarId: targetCalendarId } : block
          )
        );
      }

      return { previousData, weekKey };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(calendarKeys.week(context.weekKey), context.previousData);
      }
    },
    onSuccess: (result, variables, context) => {
      // Update cache with complete block data including new event ID and calendar ID
      if (context) {
        const data = queryClient.getQueryData<Block[]>(calendarKeys.week(context.weekKey));
        if (data) {
          queryClient.setQueryData<Block[]>(
            calendarKeys.week(context.weekKey),
            data.map((block) =>
              block.id === variables.blockId && block.calendarId === variables.targetCalendarId
                ? { ...block, id: result.newEventId, calendarId: variables.targetCalendarId }
                : block
            )
          );
        }
      }
    },
  });
}

/**
 * Hook to update event details (title, description, time)
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blockId,
      calendarId,
      title,
      description,
      startTime,
      endTime,
      allDay,
    }: {
      blockId: string;
      calendarId: string;
      title?: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      allDay?: boolean;
    }) => {
      return eventsApi.updateEvent(calendarId, blockId, { title, description, startTime, endTime, allDay });
    },
    onMutate: async ({ blockId, calendarId, title, description, startTime, endTime }) => {
      const weekKey = getWeekKey(startTime);
      await queryClient.cancelQueries({ queryKey: calendarKeys.week(weekKey) });

      const previousData = queryClient.getQueryData<Block[]>(calendarKeys.week(weekKey));

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<Block[]>(
          calendarKeys.week(weekKey),
          previousData.map((block) =>
            block.id === blockId && block.calendarId === calendarId
              ? {
                  ...block,
                  ...(title !== undefined && { title }),
                  ...(description !== undefined && { description }),
                  startTime,
                  endTime,
                }
              : block
          )
        );
      }

      return { previousData, weekKey };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(calendarKeys.week(context.weekKey), context.previousData);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      // Refetch to ensure consistency
      if (context) {
        queryClient.invalidateQueries({ queryKey: calendarKeys.week(context.weekKey) });
      }
    },
  });
}

/**
 * Hook to delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blockId, calendarId }: { blockId: string; calendarId: string; startTime: Date }) => {
      return eventsApi.deleteEvent(calendarId, blockId);
    },
    onMutate: async ({ blockId, calendarId, startTime }) => {
      const weekKey = getWeekKey(startTime);
      await queryClient.cancelQueries({ queryKey: calendarKeys.week(weekKey) });

      const previousData = queryClient.getQueryData<Block[]>(calendarKeys.week(weekKey));

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<Block[]>(
          calendarKeys.week(weekKey),
          previousData.filter((block) => !(block.id === blockId && block.calendarId === calendarId))
        );
      }

      return { previousData, weekKey };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(calendarKeys.week(context.weekKey), context.previousData);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      // Refetch to ensure consistency
      if (context) {
        queryClient.invalidateQueries({ queryKey: calendarKeys.week(context.weekKey) });
      }
    },
  });
}
