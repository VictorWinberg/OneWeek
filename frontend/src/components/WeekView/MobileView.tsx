import { useEffect, useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useCalendarStore } from '@/stores/calendarStore';
import { useConfigStore } from '@/stores/configStore';
import { usePrefetchAdjacentWeeks, useUpdateEvent, useMoveEvent, useWeekEvents } from '@/hooks/useCalendarQueries';
import { formatWeekHeader, getWeekNumber } from '@/utils/dateUtils';
import { urlToMobileViewMode, mobileToUrlViewMode, type MobileViewMode, type UrlViewMode } from '@/utils/viewModeUtils';
import { useMobileDragAndDrop } from '@/hooks/useDragAndDrop';
import { EventCard } from '@/components/WeekView/EventCard';
import { MobileListView } from '@/components/WeekView/MobileListView';
import { MobileGridView } from '@/components/WeekView/MobileGridView';
import { MobileUserView } from '@/components/WeekView/MobileUserView';
import { MobileHourView } from '@/components/WeekView/MobileHourView';
import { SwipeableWeekContainer } from '@/components/WeekView/SwipeableWeekContainer';
import type { Block } from '@/types';

interface MobileViewProps {
  onBlockClick: (block: Block) => void;
  onCreateEventForDate?: (date: Date, calendarId?: string, startTime?: string, endTime?: string) => void;
  viewMode?: UrlViewMode;
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  onViewModeChange?: (mode: UrlViewMode) => void;
  onGoToToday?: () => void;
}

export function MobileView({
  onBlockClick,
  onCreateEventForDate,
  viewMode: urlViewMode,
  onNextWeek,
  onPrevWeek,
  onViewModeChange,
  onGoToToday,
}: MobileViewProps) {
  const { selectedDate } = useCalendarStore();
  const { config } = useConfigStore();

  const { prefetch } = usePrefetchAdjacentWeeks(selectedDate);
  const updateEventTime = useUpdateEvent();
  const moveEvent = useMoveEvent();

  const calendars = config.calendars;
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);

  // Use mobile drag and drop hook with ALL weeks' blocks (merged from SwipeableWeekContainer)
  // This ensures drag and drop works from any week position (prev/current/next)
  const { activeBlock: currentActiveBlock, handleDragStart, handleDragEnd, sensors } = useMobileDragAndDrop(
    allBlocks,
    {
      updateEventTime,
      moveEvent,
    }
  );

  // Update activeBlock state when it changes
  useEffect(() => {
    setActiveBlock(currentActiveBlock);
  }, [currentActiveBlock]);

  // Prefetch adjacent weeks when selectedDate changes
  useEffect(() => {
    prefetch();
  }, [selectedDate, prefetch]);

  // Compute current mobile view mode from URL mode
  const mobileViewMode = urlToMobileViewMode(urlViewMode, 'grid');

  // Handle view mode changes - all modes now map directly to URL
  const handleViewModeChange = (newMobileMode: MobileViewMode) => {
    const newUrlMode = mobileToUrlViewMode(newMobileMode);
    if (onViewModeChange) {
      onViewModeChange(newUrlMode);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SwipeableWeekContainer
        selectedDate={selectedDate}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        activeBlock={activeBlock}
        onAllBlocksChange={setAllBlocks}
      >
        {({ date, weekDays, blocks, isLoading }) => {
          const weekNumber = getWeekNumber(date);

          if (isLoading) {
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
              {/* Header */}
              <header className="flex flex-col gap-2 p-4 border-b border-[var(--color-bg-tertiary)]">
                {/* Week header with navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={onPrevWeek}
                    className="p-1.5 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex flex-col items-center">
                    <h1
                      onClick={onGoToToday}
                      className="text-lg font-bold text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent)] transition-colors"
                    >
                      {formatWeekHeader(date)}
                    </h1>
                    <span className="text-xs text-[var(--color-text-secondary)]">v.{weekNumber}</span>
                  </div>

                  <button
                    onClick={onNextWeek}
                    className="p-1.5 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1 bg-[var(--color-bg-tertiary)] rounded-lg p-1">
                  <button
                    onClick={() => handleViewModeChange('grid')}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      mobileViewMode === 'grid'
                        ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                        : 'text-[var(--color-text-secondary)]'
                    }`}
                  >
                    Översikt
                  </button>
                  <button
                    onClick={() => handleViewModeChange('list')}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      mobileViewMode === 'list'
                        ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                        : 'text-[var(--color-text-secondary)]'
                    }`}
                  >
                    Agenda
                  </button>
                  <button
                    onClick={() => handleViewModeChange('calendar')}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      mobileViewMode === 'calendar'
                        ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                        : 'text-[var(--color-text-secondary)]'
                    }`}
                  >
                    Personlig
                  </button>
                  <button
                    onClick={() => handleViewModeChange('hour')}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      mobileViewMode === 'hour'
                        ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                        : 'text-[var(--color-text-secondary)]'
                    }`}
                  >
                    Timvy
                  </button>
                </div>
              </header>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {mobileViewMode === 'list' ? (
                  <MobileListView
                    weekDays={weekDays}
                    blocks={blocks}
                    onBlockClick={onBlockClick}
                    onCreateEventForDate={onCreateEventForDate}
                  />
                ) : mobileViewMode === 'grid' ? (
                  <MobileGridView
                    weekDays={weekDays}
                    blocks={blocks}
                    onBlockClick={onBlockClick}
                    onCreateEventForDate={onCreateEventForDate}
                  />
                ) : mobileViewMode === 'hour' ? (
                  <MobileHourView
                    weekDays={weekDays}
                    blocks={blocks}
                    onBlockClick={onBlockClick}
                    activeBlock={currentActiveBlock}
                    onCreateEventForDate={onCreateEventForDate}
                  />
                ) : (
                  <MobileUserView
                    weekDays={weekDays}
                    blocks={blocks}
                    calendars={calendars}
                    onBlockClick={onBlockClick}
                    onCreateEventForDate={onCreateEventForDate}
                    activeBlock={currentActiveBlock}
                  />
                )}
              </div>

            </div>
          );
        }}
      </SwipeableWeekContainer>
      {/* Drag Overlay must be outside SwipeableWeekContainer but inside DndContext */}
      <DragOverlay>
        {currentActiveBlock ? (
          <div
            className="opacity-90"
            style={
              mobileViewMode === 'hour' && !currentActiveBlock.allDay
                ? {
                    // Calculate height based on event duration to match the original size
                    height: `${Math.max(
                      ((currentActiveBlock.endTime.getTime() - currentActiveBlock.startTime.getTime()) /
                        (1000 * 60 * 60)) *
                        50,
                      25
                    )}px`,
                    width: '100%',
                    minWidth: '42px',
                  }
                : undefined
            }
          >
            <EventCard
              block={currentActiveBlock}
              onClick={() => {}}
              compact={true}
              fillHeight={mobileViewMode === 'hour' ? true : false}
              hideTime={mobileViewMode === 'hour'}
              extraCompact={mobileViewMode === 'hour'}
              isAllDay={currentActiveBlock.allDay}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
