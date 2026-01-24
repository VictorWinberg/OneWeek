import { useEffect, useMemo } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { addWeeks, subWeeks } from 'date-fns';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { usePrefetchAdjacentWeeks, useUpdateEvent, useMoveEvent, useWeekEvents } from '@/hooks/useCalendarQueries';
import { urlToMobileViewMode, type UrlViewMode } from '@/utils/viewModeUtils';
import { useMobileDragAndDrop } from '@/hooks/useDragAndDrop';
import { EventCard } from '@/components/WeekView/EventCard';
import { MobileListView } from '@/components/WeekView/MobileListView';
import { MobileGridView } from '@/components/WeekView/MobileGridView';
import { MobileUserView } from '@/components/WeekView/MobileUserView';
import { MobileHourView } from '@/components/WeekView/MobileHourView';
import { SwipeableWeekContainer } from '@/components/WeekView/SwipeableWeekContainer';
import { useAppContext } from '@/contexts/AppContext';

interface MobileViewProps {
  viewMode?: UrlViewMode;
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
}

export function MobileView({
  viewMode: urlViewMode,
  onNextWeek,
  onPrevWeek,
}: MobileViewProps) {
  const { selectedDate } = useCalendarStore();
  const { config } = useConfigStore();
  const { activeBlock } = useAppContext();

  const { prefetch } = usePrefetchAdjacentWeeks(selectedDate);
  const updateEventTime = useUpdateEvent();
  const moveEvent = useMoveEvent();

  const calendars = config.calendars;

  // Fetch blocks for current, previous, and next weeks
  const prevWeekDate = subWeeks(selectedDate, 1);
  const nextWeekDate = addWeeks(selectedDate, 1);
  const { data: prevBlocks = [] } = useWeekEvents(prevWeekDate);
  const { data: currentBlocks = [] } = useWeekEvents(selectedDate);
  const { data: nextBlocks = [] } = useWeekEvents(nextWeekDate);

  // Combine all blocks for drag and drop
  const allBlocks = useMemo(
    () => [...prevBlocks, ...currentBlocks, ...nextBlocks],
    [prevBlocks, currentBlocks, nextBlocks]
  );

  const { handleDragStart, handleDragEnd, sensors } = useMobileDragAndDrop(allBlocks, {
    updateEventTime,
    moveEvent,
  });

  useEffect(() => {
    prefetch();
  }, [selectedDate, prefetch]);

  const mobileViewMode = urlToMobileViewMode(urlViewMode, 'grid');

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SwipeableWeekContainer
        selectedDate={selectedDate}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
      >
        {({ weekDays, blocks, isLoading }) => {
            if (isLoading && blocks.length === 0) {
              return (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[var(--color-text-secondary)]">Laddar events...</p>
                  </div>
                </div>
              );
            }

          return (
              <div className="flex flex-col h-full overflow-hidden">
              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {mobileViewMode === 'list' ? (
                  <MobileListView weekDays={weekDays} blocks={blocks} />
                ) : mobileViewMode === 'grid' ? (
                  <MobileGridView weekDays={weekDays} blocks={blocks} />
                ) : mobileViewMode === 'hour' ? (
                  <MobileHourView weekDays={weekDays} blocks={blocks} />
                ) : (
                  <MobileUserView weekDays={weekDays} blocks={blocks} calendars={calendars} />
                )}
              </div>

              </div>
            );
          }}
          </SwipeableWeekContainer>
        <DragOverlay>
          {activeBlock ? (
            <div
              className="opacity-90"
              style={
                mobileViewMode === 'hour' && !activeBlock.allDay
                  ? {
                      // Calculate height based on event duration to match the original size
                      height: `${Math.max(
                        ((activeBlock.endTime.getTime() - activeBlock.startTime.getTime()) / (1000 * 60 * 60)) * 50,
                        25
                      )}px`,
                      width: '100%',
                      minWidth: '42px',
                    }
                  : undefined
              }
            >
              <EventCard
                block={activeBlock}
                compact={true}
                fillHeight={mobileViewMode === 'hour' ? true : false}
                hideTime={mobileViewMode === 'hour'}
                extraCompact={mobileViewMode === 'hour'}
                isAllDay={activeBlock.allDay}
              />
            </div>
          ) : null}
        </DragOverlay>
    </DndContext>
  );
}
